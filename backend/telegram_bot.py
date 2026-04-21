import json
import os
import time
import urllib.request
import urllib.parse

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://192.168.0.121:3000/api/v1').strip().rstrip('/')
TELEGRAM_CONFIRM_SECRET = os.environ.get('TELEGRAM_CONFIRM_SECRET', '').strip()

if not TELEGRAM_BOT_TOKEN:
    raise SystemExit('Missing env TELEGRAM_BOT_TOKEN')

if not TELEGRAM_CONFIRM_SECRET:
    raise SystemExit('Missing env TELEGRAM_CONFIRM_SECRET (must match backend)')

API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def http_get(url: str):
    with urllib.request.urlopen(url, timeout=30) as resp:
        return resp.read().decode('utf-8')


def http_post_json(url: str, data: dict, headers: dict | None = None):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8')


def tg_send_message(chat_id: str, text: str):
    payload = {
        'chat_id': chat_id,
        'text': text,
    }
    http_post_json(f"{API_BASE}/sendMessage", payload)


def backend_confirm_code(code: str, chat_id: str):
    payload = {
        'code': code,
        'chatId': chat_id,
    }
    headers = {
        'x-telegram-confirm-secret': TELEGRAM_CONFIRM_SECRET,
    }
    return http_post_json(f"{BACKEND_URL}/auth/telegram/confirm", payload, headers=headers)


def extract_code(text: str) -> str | None:
    text = (text or '').strip()
    if text.startswith('/start'):
        parts = text.split(' ', 1)
        if len(parts) == 2:
            return parts[1].strip()
    # allow sending code as plain 6 digits
    if text.isdigit() and len(text) == 6:
        return text
    return None


def main():
    print('[telegram_bot] starting long polling')
    print(f"[telegram_bot] backend: {BACKEND_URL}")

    offset = 0

    while True:
        try:
            params = {
                'timeout': 30,
                'offset': offset,
            }
            url = f"{API_BASE}/getUpdates?{urllib.parse.urlencode(params)}"
            raw = http_get(url)
            data = json.loads(raw)

            if not data.get('ok'):
                print('[telegram_bot] getUpdates not ok:', data)
                time.sleep(2)
                continue

            for update in data.get('result', []):
                offset = max(offset, update.get('update_id', 0) + 1)

                message = update.get('message') or update.get('edited_message')
                if not message:
                    continue

                chat = message.get('chat') or {}
                chat_id = str(chat.get('id', ''))
                text = message.get('text', '')

                code = extract_code(text)

                if not code:
                    continue

                try:
                    backend_confirm_code(code, chat_id)
                    tg_send_message(chat_id, '✅ Код подтверждён! Вернитесь в приложение и нажмите "Продолжить".')
                    print(f"[telegram_bot] confirmed code={code} chat_id={chat_id}")
                except Exception as e:
                    print('[telegram_bot] confirm failed:', e)
                    tg_send_message(chat_id, '❌ Не удалось подтвердить код. Проверьте, что backend запущен и код ещё действителен.')

        except Exception as e:
            print('[telegram_bot] loop error:', e)
            time.sleep(2)


if __name__ == '__main__':
    main()
