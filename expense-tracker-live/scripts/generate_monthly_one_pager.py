from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
EXPENSES_TS = ROOT / "lib" / "expenses.ts"
OUTPUT_DIR = ROOT / "reports"
MARGIN = 36
PAGE_SIZE = landscape(letter)
PAGE_WIDTH, PAGE_HEIGHT = PAGE_SIZE

ACCENT = colors.HexColor("#1F9D73")
ACCENT_SOFT = colors.HexColor("#E8F6EF")
INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#DCE4EC")
CARD = colors.white
CANVAS = colors.HexColor("#F8FAFC")
NEGATIVE = colors.HexColor("#C2410C")
CATEGORY_COLORS = {
    "Housing": colors.HexColor("#9D4EDD"),
    "Food": colors.HexColor("#F59E0B"),
    "Health": colors.HexColor("#34D399"),
    "Utilities": colors.HexColor("#38BDF8"),
    "Transport": colors.HexColor("#4F46E5"),
    "Shopping": colors.HexColor("#84CC16"),
    "Entertainment": colors.HexColor("#EC4899"),
}

TWOPLACES = Decimal("0.01")
ONEPLACE = Decimal("0.1")


@dataclass(frozen=True)
class Expense:
    id: str
    date: str
    merchant: str
    description: str
    category: str
    amount: Decimal


@dataclass(frozen=True)
class Metrics:
    today: date
    month_label: str
    budget: Decimal
    spent: Decimal
    remaining: Decimal
    budget_used_pct: Decimal
    transaction_count: int
    avg_transaction: Decimal
    categories: list[dict]
    recent_transactions: list[Expense]
    top_transactions: list[Expense]
    top_category: dict | None


def money(value: Decimal) -> str:
    return f"${value.quantize(TWOPLACES, rounding=ROUND_HALF_UP):,.2f}"


def pct(value: Decimal) -> str:
    return f"{value.quantize(ONEPLACE, rounding=ROUND_HALF_UP):,.1f}%"


def parse_source(ts_path: Path) -> tuple[date, Decimal, list[Expense]]:
    text = ts_path.read_text()

    today_match = re.search(r'export const TODAY = "([0-9]{4}-[0-9]{2}-[0-9]{2})";', text)
    budget_match = re.search(r"export const MONTHLY_BUDGET = ([0-9.]+);", text)
    if not today_match or not budget_match:
        raise ValueError("Could not parse TODAY or MONTHLY_BUDGET from lib/expenses.ts")

    today = datetime.strptime(today_match.group(1), "%Y-%m-%d").date()
    budget = Decimal(budget_match.group(1))

    expense_pattern = re.compile(
        r'\{\s*id: "(?P<id>[^"]+)",\s*date: "(?P<date>[^"]+)",\s*merchant: "(?P<merchant>[^"]+)",\s*description: "(?P<description>[^"]+)",\s*category: "(?P<category>[^"]+)",\s*amount: (?P<amount>[0-9.]+)\s*\}'
    )
    expenses = [
        Expense(
            id=match.group("id"),
            date=match.group("date"),
            merchant=match.group("merchant"),
            description=match.group("description"),
            category=match.group("category"),
            amount=Decimal(match.group("amount")),
        )
        for match in expense_pattern.finditer(text)
    ]
    if not expenses:
        raise ValueError("No expenses parsed from lib/expenses.ts")

    return today, budget, expenses


def compute_metrics(today: date, budget: Decimal, expenses: Iterable[Expense]) -> Metrics:
    month_key = today.strftime("%Y-%m")
    month_label = today.strftime("%B %Y")
    monthly = [expense for expense in expenses if expense.date.startswith(month_key)]
    monthly.sort(key=lambda item: (item.date, item.id), reverse=True)

    spent = sum((expense.amount for expense in monthly), Decimal("0.00"))
    remaining = budget - spent
    budget_used_pct = (spent / budget * Decimal("100")) if budget else Decimal("0")
    transaction_count = len(monthly)
    avg_transaction = (spent / Decimal(transaction_count)) if transaction_count else Decimal("0")

    category_totals: dict[str, Decimal] = {}
    for expense in monthly:
        category_totals[expense.category] = category_totals.get(expense.category, Decimal("0")) + expense.amount

    categories = [
        {
            "category": category,
            "amount": amount,
            "share": (amount / spent * Decimal("100")) if spent else Decimal("0"),
        }
        for category, amount in category_totals.items()
    ]
    categories.sort(key=lambda item: item["amount"], reverse=True)

    top_transactions = sorted(monthly, key=lambda item: item.amount, reverse=True)[:4]
    recent_transactions = monthly[:6]
    top_category = categories[0] if categories else None

    return Metrics(
        today=today,
        month_label=month_label,
        budget=budget,
        spent=spent,
        remaining=remaining,
        budget_used_pct=budget_used_pct,
        transaction_count=transaction_count,
        avg_transaction=avg_transaction,
        categories=categories,
        recent_transactions=recent_transactions,
        top_transactions=top_transactions,
        top_category=top_category,
    )


def draw_round_rect(c: canvas.Canvas, x: float, y: float, w: float, h: float, radius: float, fill, stroke=LINE):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def draw_label_value_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, label: str, value: str, subtext: str, highlight=ACCENT):
    draw_round_rect(c, x, y, w, h, 14, CARD)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawString(x + 14, y + h - 18, label)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(x + 14, y + h - 42, value)
    c.setStrokeColor(highlight)
    c.setLineWidth(3)
    c.line(x + 14, y + 16, x + 60, y + 16)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(x + 14, y + 24, subtext)


def draw_wrapped_text(c: canvas.Canvas, text: str, x: float, y: float, max_width: float, leading: float, font_name="Helvetica", font_size=10, color=INK) -> float:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    c.setFillColor(color)
    c.setFont(font_name, font_size)
    cursor = y
    for line in lines:
        c.drawString(x, cursor, line)
        cursor -= leading
    return cursor


def render_pdf(metrics: Metrics, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(out_path), pagesize=PAGE_SIZE)
    c.setTitle(f"{metrics.month_label} Financial Ledger One-Pager")
    c.setAuthor("Hermes Agent")
    c.setSubject("Monthly expense summary")

    c.setFillColor(CANVAS)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    usable_width = PAGE_WIDTH - 2 * MARGIN
    top = PAGE_HEIGHT - MARGIN

    # Header
    header_h = 84
    draw_round_rect(c, MARGIN, top - header_h, usable_width, header_h, 22, ACCENT_SOFT, stroke=ACCENT_SOFT)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 20, top - 22, "FINANCIAL LEDGER")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(MARGIN + 20, top - 48, f"{metrics.month_label} one-page summary")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    subtitle = f"Generated from ledger data through {metrics.today.strftime('%b %d, %Y')}"
    c.drawString(MARGIN + 20, top - 66, subtitle)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(MARGIN + usable_width - 20, top - 32, money(metrics.spent))
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawRightString(MARGIN + usable_width - 20, top - 50, "spent to date")

    # Metric cards
    cards_y = top - header_h - 18 - 84
    gap = 12
    card_w = (usable_width - gap * 4) / 5
    card_h = 84
    cards = [
        ("Monthly budget", money(metrics.budget), "planned spend"),
        ("Spent so far", money(metrics.spent), f"{metrics.transaction_count} transactions"),
        ("Left to spend", money(metrics.remaining), "under target" if metrics.remaining >= 0 else "over budget"),
        ("Budget used", pct(metrics.budget_used_pct), f"avg txn {money(metrics.avg_transaction)}"),
        (
            "Top category",
            metrics.top_category["category"] if metrics.top_category else "—",
            money(metrics.top_category["amount"]) if metrics.top_category else "no expenses",
        ),
    ]
    for idx, (label, value, subtext) in enumerate(cards):
        x = MARGIN + idx * (card_w + gap)
        highlight = CATEGORY_COLORS.get(value, ACCENT) if label == "Top category" else ACCENT
        draw_label_value_card(c, x, cards_y, card_w, card_h, label, value, subtext, highlight=highlight)

    # Lower sections
    lower_top = cards_y - 18
    column_gap = 14
    left_w = 212
    middle_w = 258
    right_w = usable_width - left_w - middle_w - 2 * column_gap
    section_h = 302

    left_x = MARGIN
    mid_x = left_x + left_w + column_gap
    right_x = mid_x + middle_w + column_gap
    section_y = lower_top - section_h

    # Left section: takeaways + top transactions
    draw_round_rect(c, left_x, section_y, left_w, section_h, 18, CARD)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(left_x + 16, section_y + section_h - 24, "Key takeaways")

    bullets = [
        f"{metrics.top_category['category']} leads at {money(metrics.top_category['amount'])} ({pct(metrics.top_category['share'])}) of monthly spend."
        if metrics.top_category
        else "No category spend recorded.",
        f"{money(metrics.remaining)} remains from the {money(metrics.budget)} monthly budget.",
        f"The month has {metrics.transaction_count} recorded transactions through {metrics.today.strftime('%b %d')}.",
    ]
    cursor = section_y + section_h - 48
    for bullet in bullets:
        c.setFillColor(ACCENT)
        c.circle(left_x + 22, cursor + 4, 2.5, fill=1, stroke=0)
        cursor = draw_wrapped_text(c, bullet, left_x + 32, cursor, left_w - 48, 13, font_size=10, color=INK) - 8

    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(left_x + 16, cursor - 2, "Largest transactions")
    cursor -= 18
    for expense in metrics.top_transactions:
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(left_x + 16, cursor, expense.merchant)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9)
        c.drawString(left_x + 16, cursor - 12, expense.description)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawRightString(left_x + left_w - 16, cursor, money(expense.amount))
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9)
        c.drawRightString(left_x + left_w - 16, cursor - 12, datetime.strptime(expense.date, "%Y-%m-%d").strftime("%b %d"))
        cursor -= 28

    # Middle section: category bars
    draw_round_rect(c, mid_x, section_y, middle_w, section_h, 18, CARD)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(mid_x + 16, section_y + section_h - 24, "Category breakdown")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(mid_x + 16, section_y + section_h - 38, "Exact share of this month's spend")

    bar_top = section_y + section_h - 64
    bar_left = mid_x + 16
    bar_width = middle_w - 32
    row_gap = 32
    for idx, item in enumerate(metrics.categories):
        y = bar_top - idx * row_gap
        color = CATEGORY_COLORS.get(item["category"], ACCENT)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(bar_left, y, item["category"])
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9)
        c.drawRightString(bar_left + bar_width, y, f"{money(item['amount'])}  •  {pct(item['share'])}")
        c.setFillColor(colors.HexColor("#EEF2F7"))
        c.roundRect(bar_left, y - 14, bar_width, 10, 5, fill=1, stroke=0)
        c.setFillColor(color)
        fill_width = max(18, float(item["share"]) / 100 * bar_width)
        c.roundRect(bar_left, y - 14, min(fill_width, bar_width), 10, 5, fill=1, stroke=0)

    total_y = section_y + 16
    c.setStrokeColor(LINE)
    c.line(bar_left, total_y + 26, bar_left + bar_width, total_y + 26)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(bar_left, total_y + 10, "All values recomputed from raw transaction amounts.")

    # Right section: recent transactions
    draw_round_rect(c, right_x, section_y, right_w, section_h, 18, CARD)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(right_x + 16, section_y + section_h - 24, "Recent transactions")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(right_x + 16, section_y + section_h - 38, "Most recent six items in the current month")

    table_top = section_y + section_h - 62
    header_y = table_top
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(right_x + 16, header_y, "DATE")
    c.drawString(right_x + 58, header_y, "MERCHANT")
    c.drawRightString(right_x + right_w - 16, header_y, "AMOUNT")
    c.setStrokeColor(LINE)
    c.line(right_x + 16, header_y - 6, right_x + right_w - 16, header_y - 6)

    row_y = header_y - 24
    for idx, expense in enumerate(metrics.recent_transactions):
        if idx % 2 == 0:
            c.setFillColor(colors.HexColor("#FBFDFF"))
            c.roundRect(right_x + 10, row_y - 10, right_w - 20, 24, 6, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica", 8.5)
        c.drawString(right_x + 16, row_y + 2, datetime.strptime(expense.date, "%Y-%m-%d").strftime("%b %d"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(right_x + 58, row_y + 2, expense.merchant[:22])
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8)
        c.drawString(right_x + 58, row_y - 9, expense.category)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(right_x + right_w - 16, row_y + 2, money(expense.amount))
        row_y -= 34

    footer = f"{metrics.month_label} Financial Ledger • 1 page • generated by scripts/generate_monthly_one_pager.py"
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, 14, footer)
    c.drawRightString(PAGE_WIDTH - MARGIN, 14, "Page 1 of 1")

    c.showPage()
    c.save()


def default_output_path(today: date) -> Path:
    month_slug = today.strftime("%Y-%m")
    return OUTPUT_DIR / f"expense-report-{month_slug}-one-pager.pdf"


def main() -> None:
    today, budget, expenses = parse_source(EXPENSES_TS)
    metrics = compute_metrics(today, budget, expenses)
    out_path = default_output_path(today)
    render_pdf(metrics, out_path)
    print(out_path.resolve())


if __name__ == "__main__":
    main()
