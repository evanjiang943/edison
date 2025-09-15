#!/usr/bin/env python3

import requests
import json

def test_parse_api():
    # First, let's get a token by logging in
    login_data = {
        "username": "test_instructor@example.com",  # Use existing instructor
        "password": "password123"
    }
    
    try:
        login_response = requests.post("http://localhost:8000/api/auth/login", data=login_data)
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            print("Login successful, got token")
        else:
            print(f"Login failed: {login_response.status_code} - {login_response.text}")
            return
    except Exception as e:
        print(f"Login error: {e}")
        return
    
    # Now test the parse endpoint
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Read test files
    files = {}
    try:
        with open('test_assignment.tex', 'rb') as f:
            files['assignment_file'] = ('test_assignment.tex', f.read(), 'text/plain')
    except:
        pass
        
    try:
        with open('test_answer_key.tex', 'rb') as f:
            files['answer_key_file'] = ('test_answer_key.tex', f.read(), 'text/plain')
    except:
        pass
        
    try:
        with open('test_rubric.tex', 'rb') as f:
            files['rubric_file'] = ('test_rubric.tex', f.read(), 'text/plain')
    except:
        pass
    
    print(f"Uploading {len(files)} files...")
    
    try:
        response = requests.post(
            "http://localhost:8000/api/assignments/parse-files",
            headers=headers,
            files=files
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {response.headers}")
        print(f"Response content: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print("\nParsed data:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Request error: {e}")

if __name__ == "__main__":
    test_parse_api()
