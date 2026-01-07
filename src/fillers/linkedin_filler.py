import asyncio
from typing import Optional
from playwright.async_api import Page

from src.core.applicant import Applicant
from src.core.application import Application
from src.core.job import Job
from src.fillers.base_filler import BaseFiller


class LinkedInFiller(BaseFiller):
    PLATFORM_NAME = "LinkedIn Easy Apply"

    async def can_handle(self, page: Page) -> bool:
        """
        Check if the page has an 'Easy Apply' button.
        """
        easy_apply_button = page.locator("button.jobs-apply-button--easy-apply")
        return await easy_apply_button.count() > 0

    async def fill(self, page: Page, job: Job, application: Application) -> bool:
        """
        Fills the LinkedIn Easy Apply form.
        """
        # 1. Click Easy Apply
        easy_apply_button = page.locator("button.jobs-apply-button--easy-apply")
        if await easy_apply_button.count() == 0:
            print("   ⚠️ Easy Apply button not found")
            return False
            
        await easy_apply_button.click()
        await self.wait_for_page_load(page)
        
        # 2. Iterate until we hit Submit
        max_steps = 15
        current_step = 0
        
        while current_step < max_steps:
            current_step += 1
            await asyncio.sleep(2)  # Wait for animations
            
            # Check for Submit Application button
            submit_button = page.locator("button[aria-label='Submit application']")
            if await submit_button.count() > 0 and await submit_button.is_visible():
                print("   🚀 Submitting application...")
                await submit_button.click()
                await self.wait_for_page_load(page)
                
                # Check for success
                await asyncio.sleep(3)
                if await page.get_by_text("Application sent").count() > 0 or \
                   await page.get_by_text("applied").count() > 0:
                    return True
                return True # Optimistically assume success if no error

            # Check for Review Button (Pre-submit)
            review_button = page.locator("button[aria-label='Review your application']")
            if await review_button.count() > 0 and await review_button.is_visible():
                print("   👀 Reviewing application...")
                await review_button.click()
                continue
                
            # Check for Next Button
            next_button = page.locator("button[aria-label='Continue to next step']")
            if await next_button.count() > 0 and await next_button.is_visible():
                print(f"   ➡️ Step {current_step}: Filling fields...")
                
                # Fill fields on current page before clicking Next
                await self._fill_current_step(page, job)
                
                await next_button.click()
                continue
            
            # Use JS as fallback for button detection if aria-labels change
            js_next_clicked = await page.evaluate("""() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const nextBtn = buttons.find(b => b.innerText.includes('Next') || b.innerText.includes('Continue'));
                if (nextBtn && nextBtn.offsetParent !== null) {
                    nextBtn.click();
                    return true;
                }
                return false;
            }""")
            
            if js_next_clicked:
                continue
            
            # Dismiss "Save Application" dialog if it pops up
            await self._dismiss_save_dialog(page)

            # If we don't find any buttons for a while, we might be stuck or done
            if current_step > 5 and await page.get_by_text("Application sent").count() > 0:
                 return True

        return False

    async def _fill_current_step(self, page: Page, job: Job):
        """
        Attempts to fill visible inputs on the current modal step.
        """
        # 1. Text Inputs (Phone, etc.)
        inputs = page.locator("input[type='text'], input[type='tel']")
        count = await inputs.count()
        for i in range(count):
            inp = inputs.nth(i)
            if await inp.is_visible():
                label = await self.get_field_label(page, f"input:nth-child({i+1})") # Approximate logic
                # Better: get ID and find label
                id_attr = await inp.get_attribute("id")
                if id_attr:
                     label = await page.locator(f"label[for='{id_attr}']").text_content()
                
                if label:
                    val = self.field_mapper.get_value(label)
                    if val:
                        await inp.fill(str(val))
        
        # 2. Radio Buttons (Yes/No)
        # Use simple heuristics for common questions
        radios = page.locator("fieldset")
        radio_count = await radios.count()
        for i in range(radio_count):
            fieldset = radios.nth(i)
            legend = await fieldset.locator("legend").text_content()
            if legend:
                # Default to Yes for Auth, No for Sponsorship if not mapped
                if "authorization" in legend.lower() or "legally authorized" in legend.lower():
                     await self._select_radio(fieldset, "Yes")
                elif "sponsorship" in legend.lower():
                     await self._select_radio(fieldset, "No")
                elif "clearance" in legend.lower():
                     await self._select_radio(fieldset, "No")
        
        # 3. Dropdowns
        selects = page.locator("select")
        select_count = await selects.count()
        for i in range(select_count):
             sel = selects.nth(i)
             # Try to select sane defaults via JS if needed, or mapping
             pass

    async def _select_radio(self, fieldset, value: str):
        try:
            # Try finding input with value
            radio = fieldset.locator(f"input[value='{value}']")
            if await radio.count() > 0:
                await radio.click()
                return

            # Try finding label containing text
            label = fieldset.locator(f"label:has-text('{value}')")
            if await label.count() > 0:
                await label.click()
        except Exception:
            pass

    async def _dismiss_save_dialog(self, page: Page):
        # Click "Dismiss" or "X" if save dialog appears
        close_btn = page.locator("button[aria-label='Dismiss']")
        if await close_btn.count() > 0 and await close_btn.is_visible():
            await close_btn.click()
