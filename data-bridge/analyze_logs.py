import json
import os

def analyze_performance():
    shots = 0
    kills = 0
    breaches = 0
    
    log_file = 'game_logs.json'

    if not os.path.exists(log_file):
        print(f"Error: {log_file} not found. Play the game first!")
        return

    with open(log_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue # Skip empty lines
            
            try:
                event = json.loads(line)
                etype = event.get('event_type')
                
                if etype == 'fire_event':
                    shots += 1
                elif etype == 'threat_neutralized':
                    kills += 1
                elif etype == 'security_breach':
                    breaches += 1
            except json.JSONDecodeError:
                continue # Skip broken lines

    accuracy = (kills / shots * 100) if shots > 0 else 0

    print("\n--- CYBER-SECURITY SURVIVAL REPORT ---")
    print(f"Malware Neutralized: {kills}")
    print(f"Beams Fired:         {shots}")
    print(f"System Breaches:     {breaches}")
    print(f"Firewall Accuracy:   {accuracy:.2f}%")
    print("--------------------------------------\n")

if __name__ == "__main__":
    analyze_performance()