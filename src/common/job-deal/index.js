import { Button } from "@inglorious/ui/button"
import { Input } from "@inglorious/ui/input"
import { html, nothing } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { DATE_ISO_LENGTH, FIRST_INDEX } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { ErrorAlert } from "../error-alert/index.js"
import { formatAmount } from "../pay.js"
import styles from "./style.module.css"

/** Whether it's time to ask if what was agreed was settled. */
export function isSettlementOpen({ agreement, status, event_date, review }) {
  if (status !== "selected" || agreement?.status !== "confirmed") return false
  if (review && review.outcome !== "completed") return false
  const today = new Date().toISOString().slice(FIRST_INDEX, DATE_ISO_LENGTH)
  return event_date <= today
}

export const JobDeal = {
  /**
   * The amount both sides agreed, and later whether it was settled.
   * @param {{
   *   role: "organizer" | "winner",
   *   agreement?: { amount: number, currency: string, status: string } | null,
   *   settlements?: { role: string, is_settled: boolean }[],
   *   isSettlementDue: boolean,
   *   draft?: string,
   *   isBusy?: boolean,
   *   error?: string | null,
   *   onDraft?: (value: string) => void,
   *   onPropose?: () => void,
   *   onAnswer?: (isConfirmed: boolean) => void,
   *   onSettle: (isSettled: boolean) => void,
   * }} props
   */
  render({
    role,
    agreement,
    settlements = [],
    isSettlementDue,
    draft = "",
    isBusy = false,
    error = null,
    onDraft,
    onPropose,
    onAnswer,
    onSettle,
  }) {
    const status = agreement?.status
    const amount = agreement
      ? formatAmount(agreement.amount, agreement.currency)
      : ""
    return html`
      <div class=${styles.deal}>
        <h4 class=${styles.title}>${t("deal.title")}</h4>
        ${when(
          status === "confirmed",
          () => html`<p>${t("deal.confirmed", { amount })}</p>`,
          () => nothing,
        )}
        ${when(
          status === "proposed" && role === "organizer",
          () => html`<p>${t("deal.waiting", { amount })}</p>`,
        )}
        ${when(
          status === "proposed" && role === "winner",
          () => html`
            <p>${t("deal.confirmQuestion", { amount })}</p>
            <div class=${styles.actions}>
              ${Button.render({
                children: t("deal.yesAgreed"),
                color: "primary",
                shape: "pill",
                size: "md",
                isDisabled: isBusy,
                onClick: () => onAnswer(true),
              })}
              ${Button.render({
                children: t("deal.notAgreed"),
                variant: "outline",
                shape: "pill",
                size: "md",
                isDisabled: isBusy,
                onClick: () => onAnswer(false),
              })}
            </div>
          `,
        )}
        ${when(
          status === "rejected",
          () =>
            html`<p>
              ${t(
                role === "organizer"
                  ? "deal.rejectedOrganizer"
                  : "deal.rejectedWinner",
                { amount },
              )}
            </p>`,
        )}
        ${when(
          !agreement && role === "winner",
          () => html`<p>${t("deal.noneWinner")}</p>`,
        )}
        ${when(
          role === "organizer" &&
            status !== "confirmed" &&
            status !== "proposed",
          () => html`
            ${Input.render({
              id: "deal-amount",
              label: t("deal.amountLabel"),
              inputType: "number",
              value: draft,
              isFullWidth: true,
              onChange: onDraft,
            })}
            ${Button.render({
              children: t("deal.propose"),
              color: "primary",
              shape: "pill",
              size: "md",
              isDisabled: isBusy || draft === "",
              onClick: onPropose,
            })}
          `,
        )}
        ${when(isSettlementDue, () =>
          this.renderSettlement({ role, settlements, isBusy, onSettle }),
        )}
        ${ErrorAlert.render({ error })}
      </div>
    `
  },

  renderSettlement({ role, settlements, isBusy, onSettle }) {
    const mine = settlements.find((answer) => answer.role === role)
    const theirs = settlements.find((answer) => answer.role !== role)
    if (mine) {
      return html`<p>
        ${t(mine.is_settled ? "deal.answeredYes" : "deal.answeredNo")}
      </p>`
    }
    return html`
      ${when(
        theirs && !theirs.is_settled,
        () => html`<p class=${styles.contested}>${t("deal.contested")}</p>`,
      )}
      <p>${t("deal.settledQuestion")}</p>
      <div class=${styles.actions}>
        ${Button.render({
          children: t("deal.settledYes"),
          color: "primary",
          shape: "pill",
          size: "md",
          isDisabled: isBusy,
          onClick: () => onSettle(true),
        })}
        ${Button.render({
          children: t("deal.settledNo"),
          variant: "outline",
          shape: "pill",
          size: "md",
          isDisabled: isBusy,
          onClick: () => onSettle(false),
        })}
      </div>
      <p class=${styles.hint}>${t("deal.settledHint")}</p>
    `
  },
}
