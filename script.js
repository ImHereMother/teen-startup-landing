// ── Animate counter from 0 to target ──
function animateCount(el, target) {
  if (!el || target == null) return
  const duration = 800
  const start = performance.now()
  const from = 0

  function step(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    const current = Math.round(from + (target - from) * eased)
    el.textContent = current.toLocaleString()
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// ── Fetch waitlist count on load ──
async function loadCount() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('/api/count', { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return
    const { count } = await res.json()
    const el = document.getElementById('waitlist-count')
    if (el && count != null) animateCount(el, count)
  } catch (_) {
    // Silently fail — counter stays as "—"
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
  const originalHTML = btnEl.innerHTML
  btnEl.innerHTML = 'Joining…'
  msgEl.textContent = ''
  msgEl.className = 'waitlist-form__message'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await res.json()

    if (res.status === 409) {
      msgEl.textContent = "You're already on the list! We'll be in touch. 🎉"
      msgEl.classList.add('already')
      btnEl.disabled = false
      btnEl.innerHTML = originalHTML
    } else if (!res.ok) {
      msgEl.textContent = data.error || 'Something went wrong. Try again.'
      msgEl.classList.add('error')
      btnEl.disabled = false
      btnEl.innerHTML = originalHTML
    } else {
      emailEl.value = ''
      msgEl.textContent = "You're on the list! We'll email you when we launch. 🚀"
      msgEl.classList.add('success')
      btnEl.innerHTML = '✓ Joined!'
      // Update live counter with animation
      const countEl = document.getElementById('waitlist-count')
      if (countEl && data.count != null) {
        animateCount(countEl, data.count)
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      msgEl.textContent = 'Request timed out. Please try again.'
    } else {
      msgEl.textContent = 'Network error. Please try again.'
    }
    msgEl.classList.add('error')
    btnEl.disabled = false
    btnEl.innerHTML = originalHTML
  }
}

// ── Suggest an idea handler ──
async function handleSuggest() {
  const ideaEl = document.getElementById('suggest-idea')
  const btnEl  = document.getElementById('suggest-btn')
  const msgEl  = document.getElementById('suggest-msg')

  const idea = ideaEl.value.trim()
  if (!idea) return

  btnEl.disabled = true
  const originalHTML = btnEl.innerHTML
  btnEl.innerHTML = 'Sending…'
  msgEl.textContent = ''
  msgEl.className = 'suggest-form__message'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'idea', message: idea, source: 'landing' }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Something went wrong')
    }

    ideaEl.value = ''
    msgEl.textContent = '✓ Idea submitted! We review every suggestion. 🙏'
    msgEl.classList.add('success')
    btnEl.innerHTML = '✓ Sent!'
  } catch (err) {
    if (err.name === 'AbortError') {
      msgEl.textContent = 'Request timed out. Please try again.'
    } else {
      msgEl.textContent = err.message || 'Something went wrong. Try again.'
    }
    msgEl.classList.add('error')
    btnEl.disabled = false
    btnEl.innerHTML = originalHTML
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

document.getElementById('suggest-form').addEventListener('submit', (e) => {
  e.preventDefault()
  handleSuggest()
})

// ── Load count on page ready ──
loadCount()
