import os

class Config:
    QUEUE_NAME = os.getenv("QUEUE_NAME")
    LOGS_FOLDER = os.getenv("LOGS_FOLDER_PATH")    