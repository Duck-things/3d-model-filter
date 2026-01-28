# Training Your Own AI Detection Model

This is a step-by-step guide to training a machine learning model that can detect AI-generated 3D model thumbnails. No prior ML experience needed.

## Table of Contents

1. [What You'll Need](#what-youll-need)
2. [Setting Up Your Computer](#setting-up-your-computer)
3. [Collecting Training Images](#collecting-training-images)
4. [Organizing Your Dataset](#organizing-your-dataset)
5. [Training the Model](#training-the-model)
6. [Testing Your Model](#testing-your-model)
7. [Converting for Browser Use](#converting-for-browser-use)
8. [Hosting Your Model](#hosting-your-model)
9. [Using Your Model with the Script](#using-your-model-with-the-script)
10. [Troubleshooting](#troubleshooting)

---

## What You'll Need

**Hardware:**
- A computer with at least 8GB RAM (16GB recommended)
- A GPU is helpful but not required (training will just be slower on CPU)

**Software:**
- Python 3.8 or newer
- About 2GB of disk space

**Data:**
- At least 500 images of AI-generated 3D model thumbnails
- At least 500 images of human-made 3D model thumbnails
- More images = better results (1000+ per category is ideal)

**Time:**
- Setup: 30-60 minutes
- Collecting images: 2-4 hours
- Training: 30 minutes to 2 hours (depends on your hardware)

---

## Setting Up Your Computer

### Step 1: Install Python

**Windows:**
1. Go to https://www.python.org/downloads/
2. Download Python 3.11 (or latest 3.x version)
3. Run the installer
4. **IMPORTANT:** Check the box that says "Add Python to PATH"
5. Click Install

**Mac:**
1. Open Terminal (Applications > Utilities > Terminal)
2. Install Homebrew if you don't have it:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Install Python:
   ```
   brew install python
   ```

**Linux:**
```
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

### Step 2: Create a Project Folder

Create a folder somewhere on your computer for this project. For example:
- Windows: `C:\Users\YourName\ai-detector`
- Mac/Linux: `~/ai-detector`

### Step 3: Open a Terminal/Command Prompt in That Folder

**Windows:**
1. Open File Explorer, navigate to your folder
2. Click in the address bar, type `cmd`, press Enter

**Mac:**
1. Open Terminal
2. Type `cd ~/ai-detector` (or wherever your folder is)

**Linux:**
1. Open Terminal
2. Type `cd ~/ai-detector`

### Step 4: Create a Virtual Environment

This keeps your project's packages separate from other Python stuff:

```bash
python -m venv venv
```

(On some systems you might need to use `python3` instead of `python`)

### Step 5: Activate the Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

You should see `(venv)` at the start of your command prompt now.

### Step 6: Install Required Packages

```bash
pip install tensorflow tensorflowjs pillow numpy
```

This will download about 500MB of stuff. Wait for it to finish.

---

## Collecting Training Images

You need two sets of images:
1. **AI-generated** model thumbnails
2. **Human-made** model thumbnails

### Where to Find AI-Generated Images

**MakerWorld:**
1. Go to https://makerworld.com
2. Look for models with the "AIGC" badge
3. Or browse the AI category: https://makerworld.com/en/3d-models/2000

**Printables:**
1. Go to https://printables.com
2. Use the AI filter toggle to show only AI models

### Where to Find Human-Made Images

- Models with actual print photos (not just renders)
- Models from established creators with many designs
- Models uploaded before 2023 (before AI tools became common)
- Models with detailed descriptions mentioning CAD software

### How to Save Thumbnails

**Method 1: Manual (Tedious but Simple)**
1. Right-click on a thumbnail
2. Click "Save image as..."
3. Save to the appropriate folder

**Method 2: Browser DevTools (Faster)**
1. Open DevTools (F12 or right-click > Inspect)
2. Go to Network tab
3. Filter by "Img"
4. Scroll through the page
5. Right-click on image URLs > Open in new tab > Save

**Method 3: Use the Helper Script**

Save this as `collect.py` in your project folder:

```python
# thumbnail collector helper
# paste thumbnail URLs into urls.txt (one per line)
# then run: python collect.py

import os
import requests
import time

def download_images(url_file, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    with open(url_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    for i, url in enumerate(urls):
        try:
            print(f'Downloading {i+1}/{len(urls)}...')
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                # figure out extension
                ext = '.jpg'
                if 'png' in url.lower():
                    ext = '.png'
                elif 'webp' in url.lower():
                    ext = '.webp'
                
                filename = os.path.join(output_dir, f'img_{i:04d}{ext}')
                with open(filename, 'wb') as f:
                    f.write(response.content)
            time.sleep(0.5)  # be nice to servers
        except Exception as e:
            print(f'Error downloading {url}: {e}')
    
    print(f'Done! Downloaded to {output_dir}')

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print('Usage: python collect.py urls.txt output_folder')
        print('Example: python collect.py ai_urls.txt dataset/ai_generated')
    else:
        download_images(sys.argv[1], sys.argv[2])
```

Then create a text file with URLs and run:
```bash
python collect.py ai_urls.txt dataset/ai_generated
python collect.py human_urls.txt dataset/human_created
```

---

## Organizing Your Dataset

Your folder structure should look like this:

```
ai-detector/
├── venv/
├── dataset/
│   ├── ai_generated/
│   │   ├── img_0001.jpg
│   │   ├── img_0002.jpg
│   │   └── ... (500+ images)
│   └── human_created/
│       ├── img_0001.jpg
│       ├── img_0002.jpg
│       └── ... (500+ images)
├── collect.py
└── train.py (we'll create this next)
```

### Tips for Good Data

1. **Balance your classes**: Try to have roughly equal numbers of AI and human images

2. **Variety matters**: Include different types of models (figurines, functional prints, art, etc.)

3. **Include edge cases**:
   - High-quality AI models that look good
   - Human models with render-style photos
   - Low-quality human models

4. **Clean your data**: Remove any images that are:
   - Corrupted or won't load
   - Not actually model thumbnails
   - Mislabeled (AI in human folder or vice versa)

---

## Training the Model

### Create the Training Script

Save this as `train.py` in your project folder:

```python
# train.py - trains an AI detection model
# run with: python train.py

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # reduce tensorflow spam

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

# ============ SETTINGS ============
# you can tweak these

DATASET_DIR = 'dataset'      # folder containing ai_generated/ and human_created/
IMG_SIZE = 224               # image size (224 works well for MobileNet)
BATCH_SIZE = 32              # reduce if you run out of memory
EPOCHS = 20                  # max epochs (early stopping will likely stop sooner)
OUTPUT_DIR = 'trained_model' # where to save the model

# ==================================

print('='*50)
print('AI MODEL DETECTOR TRAINER')
print('='*50)

# check dataset exists
if not os.path.exists(DATASET_DIR):
    print(f'ERROR: Dataset folder "{DATASET_DIR}" not found!')
    print('Make sure you have:')
    print(f'  {DATASET_DIR}/ai_generated/ (with images)')
    print(f'  {DATASET_DIR}/human_created/ (with images)')
    exit(1)

# count images
ai_count = len(os.listdir(os.path.join(DATASET_DIR, 'ai_generated')))
human_count = len(os.listdir(os.path.join(DATASET_DIR, 'human_created')))
print(f'\nDataset:')
print(f'  AI-generated images: {ai_count}')
print(f'  Human-created images: {human_count}')
print(f'  Total: {ai_count + human_count}')

if ai_count < 100 or human_count < 100:
    print('\nWARNING: You have very few images. Results may be poor.')
    print('Try to collect at least 500 images per category.')

# data augmentation - makes the model more robust
print('\nSetting up data generators...')
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    shear_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    fill_mode='nearest',
    validation_split=0.2  # use 20% for validation
)

# load training data
train_generator = train_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',
    shuffle=True
)

# load validation data
val_generator = train_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',
    shuffle=False
)

print(f'\nClasses: {train_generator.class_indices}')
print(f'Training samples: {train_generator.samples}')
print(f'Validation samples: {val_generator.samples}')

# build the model
print('\nBuilding model...')

# use MobileNetV2 as base - its small and fast
base_model = MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(IMG_SIZE, IMG_SIZE, 3)
)

# freeze the base model first
base_model.trainable = False

# add our classification layers on top
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.5)(x)
x = Dense(64, activation='relu')(x)
x = Dropout(0.3)(x)
outputs = Dense(2, activation='softmax', name='predictions')(x)

model = Model(inputs=base_model.input, outputs=outputs)

# compile
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f'Model parameters: {model.count_params():,}')

# callbacks
callbacks = [
    EarlyStopping(
        monitor='val_accuracy',
        patience=5,
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=3,
        verbose=1
    )
]

# train phase 1: just the classification head
print('\n' + '='*50)
print('PHASE 1: Training classification head')
print('='*50)

history = model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=val_generator,
    callbacks=callbacks,
    verbose=1
)

# train phase 2: fine-tune some of the base model
print('\n' + '='*50)
print('PHASE 2: Fine-tuning')
print('='*50)

# unfreeze the last 30 layers
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

# recompile with lower learning rate
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.0001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

history_fine = model.fit(
    train_generator,
    epochs=10,
    validation_data=val_generator,
    callbacks=callbacks,
    verbose=1
)

# save the model
print('\n' + '='*50)
print('Saving model...')
print('='*50)

os.makedirs(OUTPUT_DIR, exist_ok=True)
model.save(os.path.join(OUTPUT_DIR, 'model.keras'))

# also save as h5 for compatibility
model.save(os.path.join(OUTPUT_DIR, 'model.h5'))

print(f'\nModel saved to {OUTPUT_DIR}/')

# print final accuracy
val_loss, val_acc = model.evaluate(val_generator, verbose=0)
print(f'\nFinal validation accuracy: {val_acc*100:.1f}%')

if val_acc < 0.7:
    print('\nWARNING: Accuracy is low. Try:')
    print('  - Adding more training images')
    print('  - Checking that images are labeled correctly')
    print('  - Removing low-quality or ambiguous images')
elif val_acc > 0.9:
    print('\nExcellent! Your model is performing very well.')
else:
    print('\nGood results! The model should work reasonably well.')

print('\nNext step: Convert the model for browser use.')
print('Run: python convert.py')
```

### Run the Training

Make sure your virtual environment is activated, then:

```bash
python train.py
```

You'll see output like this:
```
==================================================
AI MODEL DETECTOR TRAINER
==================================================

Dataset:
  AI-generated images: 523
  Human-created images: 498
  Total: 1021

Setting up data generators...
Found 816 images belonging to 2 classes.
Found 205 images belonging to 2 classes.

Classes: {'ai_generated': 0, 'human_created': 1}
Training samples: 816
Validation samples: 205

Building model...
Model parameters: 2,422,210

==================================================
PHASE 1: Training classification head
==================================================

Epoch 1/20
26/26 [==============================] - 45s 2s/step - loss: 0.6821 - accuracy: 0.5674 - val_loss: 0.5234 - val_accuracy: 0.7317
...
```

Training typically takes 20-60 minutes depending on your hardware.

---

## Testing Your Model

Save this as `test.py`:

```python
# test.py - test the trained model on a single image
# run with: python test.py path/to/image.jpg

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import sys
import numpy as np
from tensorflow import keras
from tensorflow.keras.preprocessing import image

MODEL_PATH = 'trained_model/model.keras'
IMG_SIZE = 224

def predict(img_path):
    # load model
    model = keras.models.load_model(MODEL_PATH)
    
    # load and preprocess image
    img = image.load_img(img_path, target_size=(IMG_SIZE, IMG_SIZE))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0
    
    # predict
    predictions = model.predict(img_array, verbose=0)
    ai_prob = predictions[0][0]
    human_prob = predictions[0][1]
    
    print(f'\nImage: {img_path}')
    print(f'AI-generated probability: {ai_prob*100:.1f}%')
    print(f'Human-created probability: {human_prob*100:.1f}%')
    
    if ai_prob > 0.6:
        print('Verdict: Likely AI-generated')
    elif human_prob > 0.6:
        print('Verdict: Likely human-created')
    else:
        print('Verdict: Uncertain')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python test.py image.jpg')
    else:
        predict(sys.argv[1])
```

Test it:
```bash
python test.py dataset/ai_generated/img_0001.jpg
python test.py dataset/human_created/img_0001.jpg
```

---

## Converting for Browser Use

The trained model needs to be converted to TensorFlow.js format to work in the browser.

Save this as `convert.py`:

```python
# convert.py - convert keras model to tensorflow.js format
# run with: python convert.py

import os
import tensorflowjs as tfjs
from tensorflow import keras

MODEL_PATH = 'trained_model/model.keras'
OUTPUT_DIR = 'tfjs_model'

print('Loading model...')
model = keras.models.load_model(MODEL_PATH)

print('Converting to TensorFlow.js format...')
os.makedirs(OUTPUT_DIR, exist_ok=True)
tfjs.converters.save_keras_model(model, OUTPUT_DIR)

print(f'\nDone! Model saved to {OUTPUT_DIR}/')
print('\nThe folder contains:')
for f in os.listdir(OUTPUT_DIR):
    size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
    print(f'  {f} ({size:,} bytes)')

print('\nNext step: Upload the tfjs_model folder to a web server.')
print('See the hosting section in the guide.')
```

Run it:
```bash
python convert.py
```

This creates a `tfjs_model` folder with:
- `model.json` - the model architecture
- `group1-shard1of1.bin` (or multiple shards) - the weights

---

## Hosting Your Model

The model files need to be hosted somewhere with CORS enabled so the browser script can load them.

### Option 1: GitHub Pages (Free, Easy)

1. Create a new GitHub repository
2. Upload the contents of `tfjs_model` folder
3. Go to Settings > Pages
4. Enable GitHub Pages from the main branch
5. Your model URL will be: `https://yourusername.github.io/yourrepo/model.json`

### Option 2: Cloudflare Pages (Free)

1. Go to https://pages.cloudflare.com
2. Connect your GitHub repo or upload directly
3. Deploy

### Option 3: Your Own Server

Upload the files to any web server. Make sure CORS is enabled:

**Nginx:**
```
location /model/ {
    add_header Access-Control-Allow-Origin *;
}
```

**Apache (.htaccess):**
```
Header set Access-Control-Allow-Origin "*"
```

---

## Using Your Model with the Script

1. Install the **ML version** of the userscript: `3d-print-ai-filter-ml.user.js`

2. In the panel, find the "Model URL" field

3. Enter your model URL: `https://yourusername.github.io/yourrepo/model.json`

4. Click "Load Model"

5. If successful, you'll see "Model loaded" in green

6. Enable "Use ML model" and "Suspected AI"

7. The script will now use your trained model for detection!

---

## Troubleshooting

### "No module named tensorflow"
Your virtual environment isn't activated. Run:
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

### "CUDA out of memory" or training crashes
Reduce the batch size in train.py:
```python
BATCH_SIZE = 16  # or even 8
```

### Model won't load in browser
1. Check that all files were uploaded (model.json AND the .bin files)
2. Check CORS headers
3. Open browser DevTools > Console for error messages
4. Try a different hosting option

### Low accuracy (<70%)
- Add more training images
- Check for mislabeled images
- Make sure your categories are balanced
- Try running training again (sometimes random initialization matters)

### Model loads but detection is wrong
- Your dataset might not represent real-world thumbnails well
- Try collecting more diverse images
- The ML threshold might need adjusting (try 0.5 or 0.7)

### Training takes forever
- Use a GPU if available
- Reduce image count for initial testing
- Use Google Colab (free GPU): https://colab.research.google.com

---

## Advanced: Multi-Output Model

If you want the model to predict both AI probability AND quality score, you'll need to:

1. Create quality labels (0-1 scores for each image)
2. Modify the training script to have multiple outputs
3. Modify the userscript to use multiple outputs

This is more complex and requires manually labeling your dataset with quality scores. See the `train_multioutput.py` file in the training folder if you want to try this.

---

## Questions?

Open an issue on GitHub if you're stuck. Include:
- Your operating system
- Python version (`python --version`)
- The full error message
- What step you were on
