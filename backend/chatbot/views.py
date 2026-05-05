import torch
import os
import unicodedata
import csv
import io
import re
import PyPDF2
from collections import Counter

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from transformers import AutoModelForSequenceClassification, AutoTokenizer

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

_model = None
_tokenizer = None

CHECKPOINT_PATH = os.path.join(settings.BASE_DIR, "modeles2", "marbert_final_export")


# ==================== MODEL LOADING ====================

def get_model():
    global _model
    if _model is None:
        if not os.path.exists(CHECKPOINT_PATH):
            raise FileNotFoundError(f"Checkpoint folder not found: {CHECKPOINT_PATH}")
        _model = AutoModelForSequenceClassification.from_pretrained(
            CHECKPOINT_PATH,
            ignore_mismatched_sizes=True,
            output_attentions=True,
        )
        _model.to(device)
        _model.eval()
    return _model


def get_tokenizer():
    global _tokenizer
    if _tokenizer is None:
        if not os.path.exists(CHECKPOINT_PATH):
            raise FileNotFoundError(f"Checkpoint folder not found: {CHECKPOINT_PATH}")
        _tokenizer = AutoTokenizer.from_pretrained(CHECKPOINT_PATH, use_fast=False)
    return _tokenizer


# ==================== TEXT PREPROCESSING ====================

def clean_text(text):
    if not text:
        return ""

    text = unicodedata.normalize("NFC", text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'ـ+', '', text)
    text = re.sub(r'(.)\1{3,}', r'\1\1', text)
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'\?{2,}', '؟', text)
    text = re.sub(r'!{2,}', '!', text)
    text = re.sub(r'^\d+\s+', '', text)
    text = re.sub(r'^\d+\.\s+', '', text)
    text = text.strip()

    return text


def is_arabic(text):
    if not text:
        return False

    code_pattern = re.compile(
        r'[a-zA-Z_]\s*=\s*|'
        r'\bimport\s+|'
        r'\bdef\s+|'
        r'\breturn\s+|'
        r're\.\w+\(|'
        r'\w+\.\w+\s*\(|'
        r'r\'[^\']+\'|'
        r'#\s*\w+'
    )
    if code_pattern.search(text):
        return False

    arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+')
    arabic_chars = len(''.join(arabic_pattern.findall(text)))
    total_chars = len(re.sub(r'\s+', '', text))

    if total_chars == 0:
        return False

    return (arabic_chars / total_chars) >= 0.60


# ==================== FILE READING FUNCTIONS ====================

def read_txt_file(file):
    try:
        content = file.read()
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text = content.decode('cp1256')
            except:
                text = content.decode('utf-8', errors='ignore')
        return text
    except Exception as e:
        raise Exception(f"خطأ في قراءة ملف txt: {str(e)}")


def read_csv_file(file):
    try:
        content = file.read()

        try:
            decoded = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                decoded = content.decode('cp1256')
            except:
                decoded = content.decode('utf-8', errors='ignore')

        reader = csv.DictReader(io.StringIO(decoded))
        sentences = []

        for row in reader:
            text_value = None

            for key in row.keys():
                if key.strip().lower() == 'text':
                    text_value = row[key]
                    break

            if text_value is None:
                values = list(row.values())
                if values:
                    text_value = values[0]

            if text_value:
                cell = text_value.strip()
                cell = re.sub(r'^\d+\.?\s*', '', cell)
                cell = re.sub(r'\s+', ' ', cell)
                cell = cell.strip()

                if len(cell) > 5 and is_arabic(cell):
                    sentences.append(cell)

        if not sentences:
            raise Exception("لم يتم العثور على نصوص عربية في ملف CSV")

        return sentences

    except Exception as e:
        raise Exception(f"خطأ في قراءة ملف csv: {str(e)}")


def read_pdf_file(file):
    try:
        reader = PyPDF2.PdfReader(file)
        all_text = []

        for page in reader.pages:
            text = page.extract_text()
            if text:
                text = text.strip()
                if text:
                    all_text.append(text)

        if not all_text:
            raise Exception("لم يتم استخراج نص من ملف PDF")

        return ' '.join(all_text)
    except Exception as e:
        raise Exception(f"خطأ في قراءة ملف pdf: {str(e)}")


def split_sentences_for_text(text):
    if not text:
        return []

    text = clean_text(text)
    sentences = []

    raw_sentences = re.split(r'[.!?؟;\n]+', text)

    for sentence in raw_sentences:
        sentence = sentence.strip()
        sentence = re.sub(r'^\d+\s*', '', sentence)
        sentence = re.sub(r'^\.\s*', '', sentence)
        sentence = re.sub(r'\s+', ' ', sentence)
        sentence = sentence.strip()

        if len(sentence) > 10 and len(sentence.split()) >= 2 and is_arabic(sentence):
            sentences.append(sentence)

    return sentences


# ==================== HELPER: CONFIDENCE CONVERSION ====================

def to_percent(confidence):
    if confidence <= 1:
        return round(confidence * 100, 2)
    return round(confidence, 2)


# ==================== INDICATORS AND WORDS EXTRACTION ====================

def extract_indicators_from_attention(important_tokens, confidence, is_sarcasm, text):
    indicators = []

    if important_tokens and len(important_tokens) > 0:
        top_token = important_tokens[0]['token']
        top_importance = important_tokens[0]['importance']

        if top_importance > 0.03:
            indicators.append(f"ركز على كلمة '{top_token}'")

    exclamation_count = text.count('!') + text.count('؟') + text.count('?')
    if exclamation_count > 1:
        indicators.append(f"علامات ترقيم مكثفة ({exclamation_count})")

    if is_sarcasm:
        if confidence > 85:
            indicators.append(f"ثقة عالية في اكتشاف السخرية ({confidence:.0f}%)")

        if len(text.split()) > 10:
            indicators.append("جملة طويلة ذات تركيب معقد")

        if not indicators:
            indicators.append("نمط لغوي يشير إلى السخرية")
    else:
        if confidence > 90:
            indicators.append(f"ثقة عالية في أنه نص عادي ({confidence:.0f}%)")
        indicators.append("لغة مباشرة وواضحة")

    return indicators[:4]


def extract_intent_words_from_attention(important_tokens, text):
    intent_words = []

    for item in important_tokens[:3]:
        token = item['token']
        if len(token) > 2:
            intent_words.append(token)

    if not intent_words:
        words = re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]{3,}', text)
        words = list(dict.fromkeys(words))
        intent_words = words[:3]

    return intent_words if intent_words else ["نص"]


def extract_keywords(text, important_tokens):
    keywords = []

    for item in important_tokens[:5]:
        token = item['token']
        if len(token) > 2 and token not in keywords:
            keywords.append(token)

    if len(keywords) < 3:
        words = re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]{3,}', text)
        word_counts = Counter(words)
        for word, count in word_counts.most_common(5):
            if word not in keywords and len(word) > 2:
                keywords.append(word)
            if len(keywords) >= 5:
                break

    return keywords[:5]


def extract_emojis(text):
    emoji_pattern = re.compile(
        r'[\U0001F600-\U0001F64F'
        r'\U0001F300-\U0001F5FF'
        r'\U0001F680-\U0001F6FF'
        r'\U0001F1E0-\U0001F1FF'
        r'\u2600-\u26FF'
        r'\u2700-\u27BF'
        r']+',
        flags=re.UNICODE
    )
    return emoji_pattern.findall(text)


def extract_punctuations(text):
    return re.findall(r'[!?؟]+', text)


# ==================== MAIN PREDICTION FUNCTION ====================

def predict_text(text):
    tokenizer = get_tokenizer()
    model = get_model()

    cleaned_text = clean_text(text)

    if not cleaned_text:
        return {
            "cls": "not_sarcasm",
            "type": "نص عادي",
            "conf": 0.0,
            "indicators": ["النص فارغ"],
            "intent_words": [],
            "emojis": [],
            "punctuations": [],
            "keywords": []
        }

    encoding = tokenizer(
        cleaned_text,
        padding="max_length",
        truncation=True,
        max_length=128,
        return_tensors="pt"
    )

    input_ids = encoding["input_ids"].to(device)
    attention_mask = encoding["attention_mask"].to(device)

    with torch.no_grad():
        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_attentions=True
        )

        logits = outputs.logits
        probs = torch.softmax(logits, dim=1)
        conf, pred = torch.max(probs, dim=1)
        attentions = outputs.attentions

    pred_idx = pred.item()
    is_sarcasm = (pred_idx == 1)

    raw_confidence = float(conf.item())

    important_tokens = []

    if attentions is not None:
        all_attentions = torch.stack(attentions)
        avg_attention = all_attentions.mean(dim=0).mean(dim=1)
        token_importance = avg_attention[0].sum(dim=0)
        tokens = tokenizer.convert_ids_to_tokens(input_ids[0])

        for idx, (token, importance) in enumerate(zip(tokens, token_importance)):
            if token in ['[CLS]', '[SEP]', '[PAD]', '[UNK]']:
                continue
            if token.startswith('##'):
                continue

            importance_val = float(importance)
            if importance_val > 0.01:
                important_tokens.append({
                    'token': token,
                    'importance': round(importance_val, 4),
                    'position': idx
                })

        important_tokens.sort(key=lambda x: x['importance'], reverse=True)

    indicators = extract_indicators_from_attention(
        important_tokens, to_percent(raw_confidence), is_sarcasm, cleaned_text
    )
    intent_words = extract_intent_words_from_attention(important_tokens, cleaned_text)
    keywords = extract_keywords(cleaned_text, important_tokens)
    emojis = extract_emojis(text)
    punctuations = extract_punctuations(cleaned_text)

    return {
        "cls": "sarcasm" if is_sarcasm else "not_sarcasm",
        "type": "سخرية" if is_sarcasm else "نص عادي",
        "conf": raw_confidence,
        "conf_percent": to_percent(raw_confidence),
        "indicators": indicators,
        "intent_words": intent_words,
        "emojis": emojis,
        "punctuations": punctuations,
        "keywords": keywords,
    }


# ==================== API VIEW ====================

@api_view(["POST"])
def analyze(request):
    text = request.data.get("text")
    file = request.FILES.get("file")

    if text:
        input_text = text.strip()

        if not input_text:
            return Response({"error": "النص فارغ"}, status=400)

        try:
            input_text = clean_text(input_text)

            if not input_text:
                return Response({"error": "النص غير صالح بعد التنظيف"}, status=400)

            result = predict_text(input_text)

            return Response({
                "source": "text",
                "text": input_text,
                "cls": result["cls"],
                "type": result["type"],
                "confidence": result["conf_percent"],
                "conf": result["conf_percent"],
                "indicators": result["indicators"],
                "intent_words": result["intent_words"],
                "emojis": result["emojis"],
                "punctuations": result["punctuations"],
                "keywords": result["keywords"],
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": f"خطأ في التحليل: {str(e)}"}, status=500)

    elif file:
        filename = file.name.lower()

        try:
            sentences = []

            if filename.endswith(".txt"):
                input_text = read_txt_file(file)
                if input_text:
                    sentences = split_sentences_for_text(input_text)

            elif filename.endswith(".csv"):
                sentences = read_csv_file(file)

            elif filename.endswith(".pdf"):
                input_text = read_pdf_file(file)
                if input_text:
                    sentences = split_sentences_for_text(input_text)

            else:
                return Response({
                    "error": "نوع الملف غير مدعوم. الأنواع المدعومة: txt, csv, pdf"
                }, status=400)

            if not sentences:
                return Response({
                    "error": "لم يتم العثور على جمل عربية صالحة للتحليل"
                }, status=400)

            results = []
            for sentence in sentences:
                if not sentence or len(sentence) < 5:
                    continue

                try:
                    res = predict_text(sentence)
                    results.append({
                        "text": sentence,
                        "cls": res["cls"],
                        "type": res["type"],
                        "confidence": res["conf_percent"],
                        "indicators": res["indicators"],
                        "intent_words": res["intent_words"],
                        "emojis": res["emojis"],
                        "punctuations": res["punctuations"],
                        "keywords": res["keywords"],
                    })
                except Exception as e:
                    results.append({
                        "text": sentence,
                        "cls": "error",
                        "type": "خطأ",
                        "confidence": 0,
                        "indicators": [f"خطأ: {str(e)}"],
                        "intent_words": [],
                        "emojis": [],
                        "punctuations": [],
                        "keywords": []
                    })

            if not results:
                return Response({"error": "لم يتم العثور على جمل صالحة للتحليل"}, status=400)

            valid_results = [r for r in results if r["cls"] != "error"]

            if not valid_results:
                return Response({"error": "جميع الجمل فشلت في التحليل"}, status=400)

            sarcasm_count = sum(1 for r in valid_results if r["cls"] == "sarcasm")
            not_sarcasm_count = len(valid_results) - sarcasm_count

            overall_confidence = round(
                sum(r["confidence"] for r in valid_results) / len(valid_results), 2
            )
            overall_cls = "sarcasm" if sarcasm_count > not_sarcasm_count else "not_sarcasm"
            overall_type = "سخرية" if overall_cls == "sarcasm" else "نص عادي"

            return Response({
                "source": "file",
                "filename": file.name,
                "count": len(results),
                "cls": overall_cls,
                "type": overall_type,
                "confidence": overall_confidence,
                "sarcasm_count": sarcasm_count,
                "not_sarcasm_count": not_sarcasm_count,
                "results": results,
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": f"خطأ في معالجة الملف: {str(e)}"}, status=500)

    else:
        return Response({"error": "النص أو الملف مطلوب"}, status=400)