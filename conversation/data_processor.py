import re
import logging

class ConversationProcessor:
    
    def __init__(self, conversation_path):
        self.conversation_path = conversation_path
    
    def getTextById(self, ids):
    
        logging.debug({"title" :"ids", "body": ids})
    
        ids_str = {}
        texts = {}
        
        for id in ids:
            texts[id] = []
            ids_str[id] = "{{ID: " + str(id) + "}}"
        
        with open(self.conversation_path, "r") as f:
            
            current_id = -1

            for line in f:                
                
                logging.debug({"title" :"line", "body": line})
                
                regex = re.compile(r'^\d{4}(\/)(((0)[0-9])|((1)[0-2]))(\/)([0-2][0-9]|(3)[0-1])')
                match = regex.search(line)
                
                logging.debug({"title" :"date", "body": match})
                
                if match:
                    for id, text_list in texts.items():
                        text_list.append(line)
                    
                    continue
                
                regex = re.compile(r'{{ID: (\d+)}}')
                match = regex.search(line)
                
                logging.debug({"title" :"ID", "body": match})
                
                if match:
                    id = int(match.group(1))
                    if id in ids:
                        texts[id].append(line)
                    current_id = id
                    continue
                   
                if current_id != -1:
                    logging.debug({"title" :"current_id", "body": [line, current_id]})
                    if current_id in ids:
                        texts[current_id].append(line)
                    continue
                    
        return texts           
                
                
    
            
                