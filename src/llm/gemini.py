import time
import json
from datetime import datetime, date
from pathlib import Path
from typing import Optional
from threading import Lock

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from src.utils.config import get_settings


class RateLimiter:
    MAX_RPM = 30  # Increased from 10
    MAX_RPD = 1000
    MAX_MONTHLY_TOKENS = 900_000
    MIN_REQUEST_INTERVAL = 2.0  # Reduced from 6.0
    
    def __init__(self, usage_file: str = "data/llm_usage.json"):
        self.usage_file = Path(usage_file)
        self.lock = Lock()
        self.last_request_time = 0.0
        self._load_usage()
    
    def _load_usage(self) -> None:
        self.usage = {
            "daily_requests": 0,
            "monthly_tokens": 0,
            "date": str(date.today()),
            "month": date.today().month,
            "requests_log": []
        }
        
        if self.usage_file.exists():
            try:
                with open(self.usage_file, 'r') as f:
                    saved = json.load(f)
                    
                if saved.get("date") != str(date.today()):
                    saved["daily_requests"] = 0
                    saved["date"] = str(date.today())
                    saved["requests_log"] = []
                
                if saved.get("month") != date.today().month:
                    saved["monthly_tokens"] = 0
                    saved["month"] = date.today().month
                
                self.usage = saved
            except Exception:
                pass
    
    def _save_usage(self) -> None:
        self.usage_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.usage_file, 'w') as f:
            json.dump(self.usage, f, indent=2)
    
    def can_make_request(self) -> tuple[bool, str]:
        with self.lock:
            if self.usage["daily_requests"] >= self.MAX_RPD:
                return False, f"Daily limit reached ({self.MAX_RPD} requests). Resets at midnight."
            
            if self.usage["monthly_tokens"] >= self.MAX_MONTHLY_TOKENS:
                return False, f"Monthly token limit reached ({self.MAX_MONTHLY_TOKENS:,} tokens)."
            
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.MIN_REQUEST_INTERVAL:
                wait_time = self.MIN_REQUEST_INTERVAL - elapsed
                return False, f"Rate limited. Wait {wait_time:.1f}s."
            
            return True, ""
    
    def wait_if_needed(self) -> None:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.MIN_REQUEST_INTERVAL:
                wait_time = self.MIN_REQUEST_INTERVAL - elapsed
                time.sleep(wait_time)
    
    def record_request(self, tokens_used: int = 0) -> None:
        with self.lock:
            self.usage["daily_requests"] += 1
            self.usage["monthly_tokens"] += tokens_used
            self.usage["requests_log"].append({
                "timestamp": datetime.now().isoformat(),
                "tokens": tokens_used
            })
            self.usage["requests_log"] = self.usage["requests_log"][-100:]
            self.last_request_time = time.time()
            self._save_usage()
    
    def get_usage_stats(self) -> dict:
        return {
            "daily_requests": self.usage["daily_requests"],
            "daily_limit": self.MAX_RPD,
            "daily_remaining": self.MAX_RPD - self.usage["daily_requests"],
            "monthly_tokens": self.usage["monthly_tokens"],
            "monthly_limit": self.MAX_MONTHLY_TOKENS,
            "monthly_remaining": self.MAX_MONTHLY_TOKENS - self.usage["monthly_tokens"],
        }
    
    def is_near_limit(self) -> bool:
        daily_pct = self.usage["daily_requests"] / self.MAX_RPD
        monthly_pct = self.usage["monthly_tokens"] / self.MAX_MONTHLY_TOKENS
        return daily_pct > 0.8 or monthly_pct > 0.8


class GeminiClient:
    def __init__(self, api_key: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.gemini_api_key
        
        if not self.api_key:
            raise ValueError("Gemini API key not found. Set GEMINI_API_KEY in .env file.")
        
        genai.configure(api_key=self.api_key)
        # Updated to available model
        self.model = genai.GenerativeModel('gemini-2.0-flash-001')
        self.rate_limiter = RateLimiter()
        self.default_config = GenerationConfig(max_output_tokens=300, temperature=0.7)
        self._limit_warning_shown = False
    
    def generate(self, prompt: str, max_tokens: int = 300, temperature: float = 0.7, system_instruction: Optional[str] = None) -> Optional[str]:
        # Retry loop for rate limits
        for attempt in range(3):
            can_proceed, reason = self.rate_limiter.can_make_request()
            
            if not can_proceed:
                if "Rate limited" in reason:
                     if attempt == 0:
                         print(f"   ⏳ Rate limited, waiting briefly...")
                     self.rate_limiter.wait_if_needed()
                     continue
                else:
                     print(f"⚠️ LLM Request blocked: {reason}")
                     return None
            
            break # Can proceed
        
        self.rate_limiter.wait_if_needed()
        
        if self.rate_limiter.is_near_limit() and not self._limit_warning_shown:
            stats = self.rate_limiter.get_usage_stats()
            print(f"⚠️ Approaching LLM limits: {stats['daily_requests']}/{stats['daily_limit']} daily, "
                  f"{stats['monthly_tokens']:,}/{stats['monthly_limit']:,} monthly tokens")
            self._limit_warning_shown = True
        
        try:
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"
            
            config = GenerationConfig(max_output_tokens=min(max_tokens, 500), temperature=temperature)
            response = self.model.generate_content(full_prompt, generation_config=config)
            
            if response and response.text:
                input_tokens = len(full_prompt) // 4
                output_tokens = len(response.text) // 4
                total_tokens = input_tokens + output_tokens
                self.rate_limiter.record_request(total_tokens)
                return response.text.strip()
            
            return None
            
        except Exception as e:
            error_msg = str(e).lower()
            
            # More specific check for rate limit errors
            is_rate_limit = "429" in error_msg or "quota" in error_msg or "resource_exhausted" in error_msg
            if is_rate_limit:
                print(f"⚠️ Rate limit exceeded: {e}")
                self.rate_limiter.record_request(0)
            elif "api key" in error_msg:
                print(f"❌ Invalid API key: {e}")
            elif "404" in error_msg or "not found" in error_msg:
                print(f"❌ Model/Resource Error (404): {e}")
            else:
                print(f"❌ LLM Error: {e}")
            
            return None
    
    
    def answer_application_question(self, question: str, job_title: str, company: str, applicant_context: str, max_length: int = 500) -> Optional[str]:
        prompt = f"""You are helping someone apply for a {job_title} position at {company}.

Answer the following application question professionally and concisely.
Keep the answer under {max_length} characters.
Be authentic and specific, avoiding generic responses.

Applicant Background:
{applicant_context}

Question: {question}

Answer (be concise and professional):"""

        max_tokens = min(max_length // 3, 300)
        return self.generate(prompt, max_tokens=max_tokens, temperature=0.7)
    
    def select_best_option(self, options: list[str], field_label: str, applicant_context: str) -> Optional[str]:
        options_str = "\n".join([f"- {opt}" for opt in options])
        prompt = f"""Select the best option from the list below for the user based on their profile.
If none are suitable, return "None".

Field: {field_label}
User Profile Summary:
{applicant_context}

Options:
{options_str}

Return ONLY the exact text of the best option. Do not explain."""
        
        response = self.generate(prompt, max_tokens=50, temperature=0.1)
        if response and response != "None" and response in options:
            return response
        # Fuzzy match LLM output back to options in case of minor diffs
        if response:
             for opt in options:
                 if opt.lower() == response.lower():
                     return opt
        return None
    
    def get_usage_stats(self) -> dict:
        return self.rate_limiter.get_usage_stats()
    
    def is_available(self) -> bool:
        can_proceed, _ = self.rate_limiter.can_make_request()
        return can_proceed


_client: Optional[GeminiClient] = None


def get_llm_client() -> GeminiClient:
    global _client
    if _client is None:
        _client = GeminiClient()
    return _client
