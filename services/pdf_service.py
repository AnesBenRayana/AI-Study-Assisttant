
from pypdf import PdfReader


def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)

    pages_text = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages_text.append(text)

    extracted_text = "\n".join(pages_text).strip()

    if not extracted_text:
        raise ValueError(
            "Aucun texte trouvé dans le PDF."
        )

    return extracted_text