import mysql.connector


def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="#Anesanes22*",
        database="ai_study_assistant"
    )