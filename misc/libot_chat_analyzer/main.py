import datetime
import re


class Relation:

    def __init__(self):
        self.receiver = None
        self.senders = dict()
        self.total_send = 0

    def received(self, _receiver):
        self.receiver = _receiver

        for sender in self.senders.keys():
            self.senders[sender] = float(self.senders[sender] / self.total_send)

    def sent(self, sender):
        if sender not in self.senders.keys():
            self.senders[sender] = 0
        self.total_send += 1
        self.senders[sender] += 1


class ChatRecord:
    class ContentType:
        PICTURE = "PIC"
        STICKER = "STICKER"
        TEXT = "TEXT"
        SYSTEM_MSG = "SYSTEM_MSG"
        UNKNOWN = "UNKNOWN"

    def __init__(self):
        self.datetime = None
        self.content_type = ChatRecord.ContentType.UNKNOWN
        self.sender = ""
        self.message = ""
        self.url = []

    def __str__(self):
        return str(
            self.datetime) + "\t>>>>" + self.sender + "<<<<\t>>>>" + self.content_type + "<<<<\t>>>>" + self.message + "<<<<"


def get_datetime_in_chat(current_time: datetime.datetime, line: list):
    corrected_time = line[0].replace("24:", "0:")

    ampm_flag = False
    if re.search("下午", corrected_time):
        corrected_time = corrected_time.replace("下午", "")
        corrected_time += " PM"
        ampm_flag = True
    elif re.search("上午", corrected_time):
        corrected_time = corrected_time.replace("上午", "")
        corrected_time += " AM"
        ampm_flag = True
    new_datetime_str = current_time.strftime("%Y-%m-%d " + corrected_time)

    new_datetime = None
    if ampm_flag:
        new_datetime = datetime.datetime.strptime(new_datetime_str, "%Y-%m-%d %I:%M %p")
    else:
        new_datetime = datetime.datetime.strptime(new_datetime_str, "%Y-%m-%d %H:%M")
    return new_datetime

def legal_message(chat:ChatRecord):
    if chat.content_type == ChatRecord.ContentType.STICKER:
        return False
    if re.search(".*\n.*\n.*\n.*\n", chat.message):
        return False

    return True

def build_relations(cleaned_chart_data):
    relation_list = list()
    current_relation = Relation()
    for chat in cleaned_chart_data:

        if re.search("收到", chat.message):
            current_relation.received(chat.sender)
            relation_list.append(current_relation)
            current_relation = Relation()
        else:
            if legal_message(chat):
                current_relation.sent(chat.sender)
    return relation_list


def chat_cleaning(path: str):
    fp = open(path, 'r', encoding='UTF-8', newline='\r\n')
    lines = fp.readlines()
    fp.close()

    current_time = None
    chat_list = list()

    for line in lines:
        if line.strip() == "":
            # print("放棄\t", line)
            continue
        if re.search('\[LINE\]', line):
            # print("放棄\t", line)
            continue
        if re.search(r"^儲存日期", line):
            # print("放棄\t", line)
            continue

        if re.search(r".*\t.*\t", line):

            line_split = line.split("\t")
            new_chat = ChatRecord()
            new_chat.datetime = get_datetime_in_chat(current_time, line_split)
            new_chat.sender = line_split[1]
            if re.search(r"\[照片\]", line_split[2]):
                new_chat.content_type = ChatRecord.ContentType.PICTURE
            elif re.search(r"\[貼圖\]", line_split[2]):
                new_chat.content_type = ChatRecord.ContentType.STICKER
            else:
                new_chat.content_type = ChatRecord.ContentType.TEXT
                new_chat.message = line_split[2].strip()
            # print("一般對話\t", line)
            # print("一般對話爬\t", new_chat)
            chat_list.append(new_chat)

        elif re.search(r".*\t", line):
            # print("系統訊息\t", line)
            pass

        elif re.match(r"^\d{4}/\d{2}/\d{2}", line):
            # new date
            current_time = datetime.datetime.strptime(line[0:10], "%Y/%m/%d")
            # print("新日期\t", current_time)

    return chat_list


def relation_statistics(relation_list):
    senders_total_dict = dict()
    receiver_total_dict = dict()

    for relation in relation_list:
        # Sender
        for sender in relation.senders.keys():
            if sender not in senders_total_dict.keys():
                senders_total_dict[sender] = 0
            senders_total_dict[sender] += relation.senders[sender]

        # Receiver
        if relation.receiver not in receiver_total_dict.keys():
            receiver_total_dict[relation.receiver] = 0
        receiver_total_dict[relation.receiver] += 1

    for sender in sorted(senders_total_dict.keys(), key=lambda x: senders_total_dict[x], reverse=True):
        print(sender, "\t", round(senders_total_dict[sender]))
    print("====")
    for receiver in sorted(receiver_total_dict.keys(), key=lambda x: receiver_total_dict[x], reverse=True):
        print(receiver, "\t", receiver_total_dict[receiver])


if __name__ == "__main__":
    chat_list = chat_cleaning("data/")
    relation_list = build_relations(chat_list)
    relation_statistics(relation_list)
