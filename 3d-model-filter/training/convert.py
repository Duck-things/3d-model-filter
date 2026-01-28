# convert.py - convert keras model to tensorflow.js format
# run with: python convert.py

import os
import tensorflowjs as tfjs
from tensorflow import keras

MODEL_PATH = 'trained_model/model.keras'
OUTPUT_DIR = 'tfjs_model'

if not os.path.exists(MODEL_PATH):
    alt_path = 'trained_model/model.h5'
    if os.path.exists(alt_path):
        MODEL_PATH = alt_path
    else:
        print(f'ERROR: Model not found at {MODEL_PATH}')
        print('Run train.py first to train a model.')
        exit(1)

print('Loading model...')
model = keras.models.load_model(MODEL_PATH)

print('Converting to TensorFlow.js format...')
os.makedirs(OUTPUT_DIR, exist_ok=True)
tfjs.converters.save_keras_model(model, OUTPUT_DIR)

print(f'\nDone! Model saved to {OUTPUT_DIR}/')
print('\nThe folder contains:')
for f in sorted(os.listdir(OUTPUT_DIR)):
    size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
    print(f'  {f} ({size:,} bytes)')

total_size = sum(os.path.getsize(os.path.join(OUTPUT_DIR, f)) for f in os.listdir(OUTPUT_DIR))
print(f'\nTotal size: {total_size:,} bytes ({total_size/1024/1024:.1f} MB)')

print('\nNext step: Upload the tfjs_model folder to a web server.')
print('See the TRAINING_GUIDE.md for hosting options.')
