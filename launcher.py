import os
import sys
import webbrowser

# Ensure Flask can find elements.json and templates relative to where the .exe is launched from
if getattr(sys, 'frozen', False):
    application_path = os.path.dirname(sys.executable)
    os.chdir(application_path)

from app import app

def main():
    print("==========================================")
    print("       WELCOME TO ETERNITY ALPHA         ")
    print("==========================================")
    
    # 1. Ask for the API key directly in the console window
    api_key = input("Please paste your Gemini API Key and press Enter: ").strip()
    
    if not api_key:
        print("\n[Error]: An API Key is required to run the game.")
        input("\nPress Enter to exit...")
        return

    # 2. Set the environment variable securely for this session
    os.environ["GEMINI_API_KEY"] = api_key
    
    print("\n[System]: Starting Game Master server...")
    print("[System]: Your web browser will open automatically.")
    print("[System]: KEEP THIS WINDOW OPEN WHILE PLAYING.\n")
    
    # 3. Open the browser automatically
    webbrowser.open("http://127.0.0.1:5000")
    
    # 4. Run Flask locally
    try:
        app.run(host="127.0.0.1", port=5000, use_reloader=False)
    except Exception as e:
        print(f"\n[CRITICAL ERROR]: {e}")
        input("\nPress Enter to close...")

if __name__ == "__main__":
    main()