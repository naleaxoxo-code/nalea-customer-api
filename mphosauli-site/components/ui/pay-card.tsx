"use client"

import * as React from "react"

/**
 * Glass payment card shown before checkout. Inspired by the 21st.dev credit-card form,
 * but it never asks for card numbers: the real card is typed on the payment provider's
 * secure page. Here the buyer only sees their name and amount land on the card.
 */
export function PayCard({
  amount,
  item,
  onPay,
  onBack,
}: {
  amount: string
  item: string
  onPay: (info: { name: string; email: string }) => void
  onBack?: () => void
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [flip, setFlip] = React.useState(false)
  const [going, setGoing] = React.useState(false)
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const ok = name.trim().length >= 2 && emailOk

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ok) return
    setGoing(true)
    setFlip(true)
    setTimeout(() => onPay({ name: name.trim(), email: email.trim() }), 900)
  }

  const letters = (name || "YOUR NAME").toUpperCase().split("")

  return (
    <form onSubmit={submit} className="pc-wrap">
      <div className={`pc-card ${flip ? "pc-flip" : ""}`}>
        <div className="pc-face pc-front">
          <div className="pc-ring pc-ring1" />
          <div className="pc-ring pc-ring2" />
          <div className="pc-row">
            <span className="pc-brand">MPHO SAULI</span>
            <span className="pc-chip" />
          </div>
          <div className="pc-amount">{amount}</div>
          <div className="pc-item">{item}</div>
          <div className="pc-row pc-bottom">
            <div>
              <div className="pc-label">Card holder</div>
              <div className="pc-name" aria-live="polite">
                {letters.map((c, i) => (
                  <span key={i + c} className="pc-letter" style={{ animationDelay: `${i * 18}ms` }}>
                    {c === " " ? " " : c}
                  </span>
                ))}
              </div>
            </div>
            <div className="pc-lock">🔒</div>
          </div>
        </div>
        <div className="pc-face pc-back">
          <div className="pc-strip" />
          <div className="pc-backtext">
            <span className="pc-spin" /> Opening secure checkout…
          </div>
        </div>
      </div>

      <label className="pc-field">
        <span>Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" required />
      </label>
      <label className="pc-field">
        <span>Email (your code is sent here)</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" required />
      </label>

      <button type="submit" disabled={!ok || going} className="pc-pay">
        {going ? "Securing…" : ok ? `Pay ${amount} securely` : "Add your name and email"}
      </button>
      <p className="pc-note">You&apos;ll type your card on the bank-grade secure checkout. We never see or store card numbers.</p>
      {onBack ? (
        <button type="button" onClick={onBack} className="pc-back-btn">
          ← Back
        </button>
      ) : null}
    </form>
  )
}
