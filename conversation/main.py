from argparse import ArgumentParser
from data_processor import ConversationProcessor
import logging
import os

if __name__ == '__main__':

    logging.basicConfig(level=logging.DEBUG)

    # extract text by user ids
    TEXTIDS_OUTPUT_PATH = "output/"
    CONVERSATION_PATH = "data/conversation.txt"

    parser = ArgumentParser()
    parser.add_argument("--ids", help="Example: python3 main.py --ids 1,7,10")
    args = parser.parse_args()

    cp = ConversationProcessor(CONVERSATION_PATH)
    
    if args.ids:
        ids = args.ids.split(",")
        ids = [int(i) for i in ids]
        
        logging.debug({"title": "ids_main", "body": ids})
        
        textIds = cp.getTextById(ids)
        
        logging.debug({"title": "textIds", "body": textIds.keys()})
        
        for userId, texts in textIds.items():
        
            if not os.path.exists(TEXTIDS_OUTPUT_PATH):
                os.makedirs(TEXTIDS_OUTPUT_PATH)
        
            with open(TEXTIDS_OUTPUT_PATH + "user_id_" + str(userId).zfill(4) + ".txt", "w") as f:
                for text in texts:
                    f.write(text)
