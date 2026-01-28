# train.py - trains an AI detection model
# run with: python train.py

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

# ============ SETTINGS ============

DATASET_DIR = 'dataset'
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 20
OUTPUT_DIR = 'trained_model'

# ==================================

print('='*50)
print('AI MODEL DETECTOR TRAINER')
print('='*50)

if not os.path.exists(DATASET_DIR):
    print(f'ERROR: Dataset folder "{DATASET_DIR}" not found!')
    print('Make sure you have:')
    print(f'  {DATASET_DIR}/ai_generated/ (with images)')
    print(f'  {DATASET_DIR}/human_created/ (with images)')
    exit(1)

ai_count = len([f for f in os.listdir(os.path.join(DATASET_DIR, 'ai_generated')) if not f.startswith('.')])
human_count = len([f for f in os.listdir(os.path.join(DATASET_DIR, 'human_created')) if not f.startswith('.')])

print(f'\nDataset:')
print(f'  AI-generated images: {ai_count}')
print(f'  Human-created images: {human_count}')
print(f'  Total: {ai_count + human_count}')

if ai_count < 100 or human_count < 100:
    print('\nWARNING: You have very few images. Results may be poor.')
    print('Try to collect at least 500 images per category.')

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
    validation_split=0.2
)

train_generator = train_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',
    shuffle=True
)

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

print('\nBuilding model...')

base_model = MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(IMG_SIZE, IMG_SIZE, 3)
)

base_model.trainable = False

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.5)(x)
x = Dense(64, activation='relu')(x)
x = Dropout(0.3)(x)
outputs = Dense(2, activation='softmax', name='predictions')(x)

model = Model(inputs=base_model.input, outputs=outputs)

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f'Model parameters: {model.count_params():,}')

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

print('\n' + '='*50)
print('PHASE 2: Fine-tuning')
print('='*50)

base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

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

print('\n' + '='*50)
print('Saving model...')
print('='*50)

os.makedirs(OUTPUT_DIR, exist_ok=True)
model.save(os.path.join(OUTPUT_DIR, 'model.keras'))
model.save(os.path.join(OUTPUT_DIR, 'model.h5'))

print(f'\nModel saved to {OUTPUT_DIR}/')

val_loss, val_acc = model.evaluate(val_generator, verbose=0)
print(f'\nFinal validation accuracy: {val_acc*100:.1f}%')

if val_acc < 0.7:
    print('\nWARNING: Accuracy is low. Try adding more training images.')
elif val_acc > 0.9:
    print('\nExcellent! Your model is performing very well.')
else:
    print('\nGood results! The model should work reasonably well.')

print('\nNext step: Run python convert.py to convert for browser use.')
