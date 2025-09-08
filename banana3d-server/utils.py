import base64

# Helper function to convert binary image data to a Data URL
def to_data_url(image_bytes):
    encoded = base64.b64encode(image_bytes).decode('utf-8')
    return f"data:image/png;base64,{encoded}"