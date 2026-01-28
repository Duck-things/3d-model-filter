# training your own detection model

so you want better detection than the built-in heuristics? fair enough. heres how to train a tensorflow.js model that can run in the browser.

## what youll need

- python 3.8+
- tensorflow 2.x
- tensorflowjs (pip install tensorflowjs)
- a bunch of images sorted into folders

## step 1: collect images

make two folders:
```
dataset/
  ai_generated/
  human_created/
```

for ai models:
- makerworld has an AIGC category, grab thumbnails from there
- printables has an ai filter toggle
- look for the obvious ones with that plastic render look

for human models:
- models with actual print photos
- established creators
- stuff from before 2023 lol

you want like 500+ images per folder minimum. more is better.

### scraping tips

i just used the browser devtools network tab to grab thumbnail urls then wget'd them. you could also:
- right click save as (tedious but works)
- use a browser extension like DownThemAll
- write a quick selenium script

the thumbnails are usually like 300x300 which is fine for training.

## step 2: training script

save this as train.py:

```python
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import tensorflowjs as tfjs

# config - tweak these
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 20

# data loading with augmentation
datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    horizontal_flip=True,
    validation_split=0.2
)

train_data = datagen.flow_from_directory(
    'dataset/',
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training'
)

val_data = datagen.flow_from_directory(
    'dataset/',
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation'
)

# use mobilenet as base (small and fast)
base = MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(IMG_SIZE, IMG_SIZE, 3)
)
base.trainable = False  # freeze for now

# add our classifier on top
x = base.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.5)(x)
x = Dense(64, activation='relu')(x)
x = Dropout(0.3)(x)
out = Dense(2, activation='softmax')(x)

model = Model(inputs=base.input, outputs=out)

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# train the classifier head first
print("training classifier head...")
model.fit(
    train_data,
    epochs=EPOCHS,
    validation_data=val_data,
    callbacks=[
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)
    ]
)

# now unfreeze some layers and fine tune
print("fine tuning...")
base.trainable = True
for layer in base.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-5),  # lower lr for fine tuning
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.fit(train_data, epochs=10, validation_data=val_data)

# save for browser use
print("converting to tfjs format...")
tfjs.converters.save_keras_model(model, 'tfjs_model/')
print("done! upload tfjs_model/ folder somewhere")
```

run it:
```bash
pip install tensorflow tensorflowjs
python train.py
```

takes maybe 20-30 min on a decent gpu, longer on cpu.

## step 3: host the model

the script creates a tfjs_model/ folder with:
- model.json
- group1-shard1of1.bin (or multiple shards)

upload this somewhere with cors enabled:
- github pages (free, easy)
- cloudflare pages
- your own server
- literally any static host

## step 4: use it in the script

theres a config option for custom model url. set it to wherever you hosted the model:

```javascript
// in the userscript settings
cfg.mlModelUrl = 'https://yourusername.github.io/ai-detector/model.json';
```

the script will load it and use it instead of/alongside the heuristics.

## tips

**class imbalance**: if you have way more of one type, the model gets biased. try to keep them roughly equal or use class weights.

**augmentation matters**: the random rotations/flips help a lot. dont skip them.

**thumbnails vary**: different sites have different thumbnail styles. include samples from all sites you care about.

**its never perfect**: youll get false positives on really clean renders and false negatives on polished ai stuff. the heuristics + ml together work better than either alone.

**retrain periodically**: ai generators keep getting better so older models become less accurate over time.

## multi-output version

if you want to predict both ai probability AND quality score:

```python
# instead of single output, do this:
x = GlobalAveragePooling2D()(base.output)
x = Dense(128, activation='relu')(x)
shared = Dropout(0.4)(x)

ai_out = Dense(1, activation='sigmoid', name='ai_prob')(shared)
quality_out = Dense(1, activation='sigmoid', name='quality')(shared)

model = Model(inputs=base.input, outputs=[ai_out, quality_out])

model.compile(
    optimizer='adam',
    loss={'ai_prob': 'binary_crossentropy', 'quality': 'mse'},
    loss_weights={'ai_prob': 1.0, 'quality': 0.5}
)
```

for quality labels youll need to manually rate images 0-1 which is tedious but gives you a model that can filter low quality regardless of ai status.

## without training (feature extraction only)

if you dont want to train anything, the script already extracts features from images:

| feature | what it measures | ai models tend to have |
|---------|-----------------|----------------------|
| smoothness | pixel variation | high (too smooth) |
| banding | color uniformity | present |
| saturation | color intensity | high |
| edges | sharp transitions | low |
| noise | natural randomness | low (too clean) |

these work ok but a trained model is more accurate.

## troubleshooting

**out of memory**: reduce BATCH_SIZE or IMG_SIZE

**model wont load in browser**: check cors headers, make sure all shards are uploaded

**low accuracy**: need more data, or data is too similar

**takes forever**: use a gpu. colab has free ones.

---

questions? open an issue on github or whatever
