from PIL import Image
import numpy as np

left = Image.open("left.png").convert("RGBA")
right = Image.open("right.png").convert("RGBA")

# Target dimensions for social media preview
target_w, target_h = 1200, 630

# Crop/resize both images to target size
def crop_to_size(img, target_w, target_h):
    # Calculate crop box to maintain aspect ratio and center the image
    img_w, img_h = img.size
    img_ratio = img_w / img_h
    target_ratio = target_w / target_h

    if img_ratio > target_ratio:
        # Image is wider - crop width
        new_w = int(img_h * target_ratio)
        left_crop = (img_w - new_w) // 2
        crop_box = (left_crop, 0, left_crop + new_w, img_h)
    else:
        # Image is taller - crop height
        new_h = int(img_w / target_ratio)
        top_crop = (img_h - new_h) // 2
        crop_box = (0, top_crop, img_w, top_crop + new_h)

    return img.crop(crop_box).resize((target_w, target_h), Image.LANCZOS)

left = crop_to_size(left, target_w, target_h)
right = crop_to_size(right, target_w, target_h)
w, h = target_w, target_h

# Create a narrower transition in the middle
# Left 40% solid (0), middle 20% transition (0->255), right 40% solid (255)
grad = np.zeros(w, dtype=np.uint8)
start_fade = int(w * 0.4)  # Start fade at 40%
end_fade = int(w * 0.6)    # End fade at 60%
fade_width = end_fade - start_fade

# Fill the gradient
grad[:start_fade] = 0  # Left side: all left image
grad[start_fade:end_fade] = np.linspace(0, 255, fade_width, dtype=np.uint8)  # Transition zone
grad[end_fade:] = 255  # Right side: all right image

grad = np.tile(grad, (h, 1))
mask = Image.fromarray(grad, mode="L")

# mask=0 picks from 'left', mask=255 picks from 'right'
out = Image.composite(right, left, mask)
out.save("preview.png")