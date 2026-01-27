"""
Thumbnail Collector for AI Model Training
=========================================

Helper script to collect thumbnails from 3D model sites.
By Achyut Sharma

Usage:
    python collect_data.py

It will open a browser and let you browse. Use keyboard commands to save
thumbnails from the current page.

Commands:
    'a' - Save current page thumbnails as AI-GENERATED
    'h' - Save current page thumbnails as HUMAN-CREATED  
    'q' - Quit

Requirements:
    pip install selenium webdriver-manager requests tqdm
"""

import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import urljoin, urlparse
from tqdm import tqdm

def setup_browser():
    """Set up Chrome browser for scraping."""
    print("Setting up Chrome browser...")
    
    options = Options()
    options.add_argument("--start-maximized")
    options.add_argument("--disable-notifications")
    # Don't use headless mode so you can see what's happening
    
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        print("Browser ready!")
        return driver
    except Exception as e:
        print(f"Error setting up browser: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure Chrome is installed")
        print("2. Try: pip install --upgrade webdriver-manager")
        raise

def get_image_urls(driver):
    """Extract all thumbnail image URLs from the current page."""
    images = driver.find_elements(By.TAG_NAME, "img")
    urls = []
    
    for img in images:
        try:
            src = img.get_attribute("src")
            if not src:
                continue
                
            # Filter for likely thumbnail images
            src_lower = src.lower()
            is_thumbnail = any(x in src_lower for x in [
                "thumb", "cover", "preview", "image", "model",
                "cdn", "media", "upload", "asset"
            ])
            
            # Skip tiny images (icons, etc.)
            try:
                width = img.size.get("width", 0)
                height = img.size.get("height", 0)
                if width < 80 or height < 80:
                    continue
            except:
                pass
            
            # Skip obvious non-thumbnails
            skip_patterns = ["logo", "icon", "avatar", "profile", "banner", "ad"]
            if any(x in src_lower for x in skip_patterns):
                continue
            
            if is_thumbnail or ("http" in src and ".jpg" in src_lower or ".png" in src_lower or ".webp" in src_lower):
                urls.append(src)
                
        except Exception as e:
            continue
    
    return list(set(urls))  # Remove duplicates

def download_images(urls, folder, prefix="img"):
    """Download images to a folder."""
    os.makedirs(folder, exist_ok=True)
    
    # Count existing files to continue numbering
    existing_files = [f for f in os.listdir(folder) if f.endswith(('.jpg', '.png', '.webp', '.jpeg'))]
    existing_count = len(existing_files)
    
    downloaded = 0
    failed = 0
    
    for i, url in enumerate(tqdm(urls, desc="Downloading", unit="img")):
        try:
            # Add headers to avoid being blocked
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, timeout=15, headers=headers)
            
            if response.status_code == 200 and len(response.content) > 5000:  # Skip tiny files
                # Determine file extension
                content_type = response.headers.get('content-type', '').lower()
                if 'png' in content_type or '.png' in url.lower():
                    ext = '.png'
                elif 'webp' in content_type or '.webp' in url.lower():
                    ext = '.webp'
                else:
                    ext = '.jpg'
                
                filename = f"{prefix}_{existing_count + downloaded + 1:05d}{ext}"
                filepath = os.path.join(folder, filename)
                
                with open(filepath, "wb") as f:
                    f.write(response.content)
                downloaded += 1
            else:
                failed += 1
                
        except Exception as e:
            failed += 1
            continue
    
    return downloaded, failed

def print_stats(ai_count, human_count):
    """Print current collection statistics."""
    total = ai_count + human_count
    print()
    print("┌─────────────────────────────────────┐")
    print("│        Collection Statistics        │")
    print("├─────────────────────────────────────┤")
    print(f"│  AI-generated:    {ai_count:>6} images     │")
    print(f"│  Human-created:   {human_count:>6} images     │")
    print(f"│  Total:           {total:>6} images     │")
    print("└─────────────────────────────────────┘")
    
    if ai_count < 500 or human_count < 500:
        needed_ai = max(0, 500 - ai_count)
        needed_human = max(0, 500 - human_count)
        print()
        print(f"  Recommended: collect {needed_ai} more AI and {needed_human} more human images")

def count_existing_images():
    """Count images already in dataset folders."""
    ai_folder = "dataset/ai_generated"
    human_folder = "dataset/human_created"
    
    ai_count = 0
    human_count = 0
    
    if os.path.exists(ai_folder):
        ai_count = len([f for f in os.listdir(ai_folder) if f.endswith(('.jpg', '.png', '.webp', '.jpeg'))])
    
    if os.path.exists(human_folder):
        human_count = len([f for f in os.listdir(human_folder) if f.endswith(('.jpg', '.png', '.webp', '.jpeg'))])
    
    return ai_count, human_count

def main():
    print()
    print("╔═══════════════════════════════════════════════════════════════╗")
    print("║        Thumbnail Collector for AI Model Training              ║")
    print("╚═══════════════════════════════════════════════════════════════╝")
    print()
    print("This tool helps you collect training data by browsing 3D model sites.")
    print()
    print("How it works:")
    print("  1. A browser window will open")
    print("  2. Browse to pages with model thumbnails")
    print("  3. Come back here and type a command to save images")
    print()
    print("Commands:")
    print("  'a' - Save thumbnails as AI-GENERATED")
    print("  'h' - Save thumbnails as HUMAN-CREATED")
    print("  's' - Show statistics")
    print("  'q' - Quit")
    print()
    
    # Count existing images
    ai_count, human_count = count_existing_images()
    if ai_count > 0 or human_count > 0:
        print(f"Found existing dataset: {ai_count} AI, {human_count} human images")
        print()
    
    input("Press Enter to open the browser...")
    
    driver = setup_browser()
    
    # Start at useful pages
    start_urls = [
        ("MakerWorld AI Category", "https://makerworld.com/en/3d-models/2000-generative-3d-model"),
        ("Printables (use AI filter)", "https://www.printables.com/search/models"),
    ]
    
    print()
    print("Starting pages:")
    for name, url in start_urls:
        print(f"  • {name}")
    print()
    
    driver.get(start_urls[0][1])
    
    print("Browser opened! Navigate to pages and use commands.")
    print("─" * 50)
    
    while True:
        print()
        command = input("Command (a/h/s/q): ").strip().lower()
        
        if command == 'q':
            print("\nExiting...")
            break
        
        elif command == 's':
            ai_count, human_count = count_existing_images()
            print_stats(ai_count, human_count)
        
        elif command == 'a':
            print("\nCollecting AI-generated thumbnails from current page...")
            urls = get_image_urls(driver)
            print(f"Found {len(urls)} potential thumbnail images")
            
            if urls:
                downloaded, failed = download_images(urls, "dataset/ai_generated", "ai")
                ai_count += downloaded
                print(f"✓ Downloaded {downloaded} images ({failed} failed)")
                print_stats(ai_count, human_count)
            else:
                print("No images found on this page.")
        
        elif command == 'h':
            print("\nCollecting human-created thumbnails from current page...")
            urls = get_image_urls(driver)
            print(f"Found {len(urls)} potential thumbnail images")
            
            if urls:
                downloaded, failed = download_images(urls, "dataset/human_created", "human")
                human_count += downloaded
                print(f"✓ Downloaded {downloaded} images ({failed} failed)")
                print_stats(ai_count, human_count)
            else:
                print("No images found on this page.")
        
        else:
            print("Unknown command. Use 'a' (AI), 'h' (human), 's' (stats), or 'q' (quit).")
    
    driver.quit()
    
    # Final statistics
    ai_count, human_count = count_existing_images()
    print()
    print("═" * 50)
    print("Collection complete!")
    print_stats(ai_count, human_count)
    print()
    
    if ai_count >= 500 and human_count >= 500:
        print("✓ You have enough images to train a model!")
        print("  Run: python train_model.py")
    else:
        print("⚠ Consider collecting more images for better results.")

if __name__ == "__main__":
    main()
