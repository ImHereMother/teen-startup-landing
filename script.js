// ── Fetch waitlist count on load ──
async function loadCount() {
  try {
    const res = await fetch('/api/count')
    if (!res.ok) return
    const { count } = await res.json()
    const el = document.getElementById('waitlist-count')
    if (el && count != null) el.textContent = count.toLocaleString()
  } catch (_) {
    // Silently fail — counter just stays as "—"
  }
}

// ── Submit handler ──
async function handleSubmit(emailId, btnId, msgId) {
  const emailEl = document.getElementById(emailId)
  const btnEl   = document.getElementById(btnId)
  const msgEl   = document.getElementById(msgId)

  const email = emailEl.value.trim()
  if (!email) return

  // Disable while submitting
  btnEl.disabled = true
  const originalText = btnEl.innerHTML
  btnEl.innerHTML = 'Joining…'
  msgEl.textContent = ''
  msgEl.className = 'waitlist-form__message'

  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()

    if (res.status === 409) {
      // Already signed up
      msgEl.textContent = "You're already on the list! We'll be in touch. 🎉"
      msgEl.classList.add('already')
    } else if (!res.ok) {
      msgEl.textContent = data.error || 'Something went wrong. Try again.'
      msgEl.classList.add('error')
      btnEl.disabled = false
      btnEl.innerHTML = originalText
    } else {
      // Success
      emailEl.value = ''
      msgEl.textContent = "You're on the list! We'll email you when we launch. 🚀"
      msgEl.classList.add('success')
      btnEl.innerHTML = '✓ Joined!'
      // Update live counter
      const countEl = document.getElementById('waitlist-count')
      if (countEl && data.count != null) {
        countEl.textContent = data.count.toLocaleString()
      }
    }
  } catch (_) {
    msgEl.textContent = 'Network error. Please try again.'
    msgEl.classList.add('error')
    btnEl.disabled = false
    btnEl.innerHTML = originalText
  }
}

// ── Bind forms ──
document.getElementById('hero-form').addEventListener('submit', (e) => {
  e.preventDefault()
  handleSubmit('hero-email', 'hero-btn', 'hero-msg')
})

document.getElementById('bottom-form').addEventListener('submit', (e) => {
  e.preventDefault()
  handleSubmit('bottom-email', 'bottom-btn', 'bottom-msg')
})

// ── Load count on page ready ──
loadCount()
