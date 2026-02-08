import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_video(file, folder_path, public_id):
    """
    Uploads a video to Cloudinary.
    :param file: The file object or path to the file.
    :param folder_path: The folder path in Cloudinary.
    :param public_id: The public ID (filename) for the video.
    :return: The Cloudinary upload response.
    """
    try:
        response = cloudinary.uploader.upload(
            file,
            resource_type="video",
            folder=folder_path,
            public_id=public_id,
            overwrite=True
        )
        return response
    except Exception as e:
        raise Exception(f"Cloudinary upload error: {str(e)}")
