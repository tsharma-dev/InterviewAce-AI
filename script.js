/* ==========================================================================
   InterviewAce AI — script.js
   Handles: nav toggle, header scroll state, scroll-reveal animations,
   the hero "mock interview" terminal typewriter, and wiring the Botpress
   webchat widget (loaded via the two <script> tags in index.html) to the
   page's own "Start Chatting" / "Open the chat window" controls.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. Mobile nav toggle                                                */
  /* ------------------------------------------------------------------ */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close the mobile menu after tapping a link
    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Header background/border once the page has scrolled             */
  /* ------------------------------------------------------------------ */
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------ */
  /* 3. Scroll-reveal for any element marked [data-reveal]               */
  /* ------------------------------------------------------------------ */
  const revealTargets = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window && revealTargets.length) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    // Fallback: just show everything if IntersectionObserver isn't available
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }

  /* ------------------------------------------------------------------ */
  /* 4. Hero terminal — typewriter mock-interview transcript             */
  /* ------------------------------------------------------------------ */
  const terminalBody = document.getElementById('terminalBody');

  // A short, representative exchange — this is the page's signature visual,
  // previewing exactly what the live chatbot below actually does.
  const transcript = [
    { who: 'user', text: 'Ask me a DSA question for a mid-level SWE round.' },
    { who: 'ai', text: 'Sure — given a rotated sorted array, find the minimum element in O(log n). Walk me through your approach.' },
    { who: 'user', text: 'I would use a modified binary search comparing mid to the right boundary.' },
    { who: 'ai', text: 'Good instinct. What happens when nums[mid] equals nums[right]?' },
  ];

  let lineIndex = 0;
  let charIndex = 0;
  let currentLineEl = null;

  function startNextLine() {
    if (!terminalBody) return;

    if (lineIndex >= transcript.length) {
      // Restart the loop after a pause, so the hero stays alive on long visits
      window.setTimeout(() => {
        terminalBody.innerHTML = '';
        lineIndex = 0;
        charIndex = 0;
        startNextLine();
      }, 2600);
      return;
    }

    const entry = transcript[lineIndex];
    const lineEl = document.createElement('p');
    lineEl.className = 'term-line';

    const promptSpan = document.createElement('span');
    promptSpan.className = entry.who === 'user' ? 'term-prompt-user' : 'term-prompt-ai';
    promptSpan.textContent = entry.who === 'user' ? '$ you  » ' : '> ai   » ';

    const textSpan = document.createElement('span');
    textSpan.className = 'term-text';

    const cursor = document.createElement('span');
    cursor.className = 'term-cursor';

    lineEl.appendChild(promptSpan);
    lineEl.appendChild(textSpan);
    lineEl.appendChild(cursor);
    terminalBody.appendChild(lineEl);

    currentLineEl = textSpan;
    charIndex = 0;
    typeChar();
  }

  function typeChar() {
    const entry = transcript[lineIndex];
    if (!entry || !currentLineEl) return;

    if (charIndex < entry.text.length) {
      currentLineEl.textContent += entry.text.charAt(charIndex);
      charIndex += 1;
      window.setTimeout(typeChar, 16 + Math.random() * 22);
    } else {
      // Remove the blinking cursor from the finished line before moving on
      const finishedCursor = currentLineEl.parentElement.querySelector('.term-cursor');
      if (finishedCursor) finishedCursor.remove();
      lineIndex += 1;
      window.setTimeout(startNextLine, 550);
    }
  }

  if (terminalBody) {
    startNextLine();
  }

  /* ------------------------------------------------------------------ */
  /* 5. Botpress webchat wiring                                          */
  /*    The widget scripts in index.html inject `window.botpress`.       */
  /*    We hook into its lifecycle events so this page's own buttons     */
  /*    can open the chat, and so visitors get a live status message.    */
  /* ------------------------------------------------------------------ */
  const chatStatus = document.getElementById('chatStatus');
  const ctaStartChat = document.getElementById('ctaStartChat');
  const ctaOpenChat = document.getElementById('ctaOpenChat');

  function setStatus(text, ready) {
    if (!chatStatus) return;
    chatStatus.textContent = text;
    chatStatus.classList.toggle('ready', Boolean(ready));
  }

  function openBotpressChat() {
    try {
      if (window.botpress && typeof window.botpress.open === 'function') {
        window.botpress.open();
      }
    } catch (err) {
      // Fail quietly in the UI — the floating widget is still available
      // to the visitor even if the programmatic open() call errors out.
      console.warn('InterviewAce AI: could not open chat automatically.', err);
    }
  }

  function scrollToChatSection() {
    const chatbotSection = document.getElementById('chatbot');
    if (chatbotSection) {
      chatbotSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (ctaStartChat) {
    ctaStartChat.addEventListener('click', () => {
      scrollToChatSection();
      window.setTimeout(openBotpressChat, 450);
    });
  }

  if (ctaOpenChat) {
    ctaOpenChat.addEventListener('click', openBotpressChat);
  }

  // Botpress's webchat exposes a global event bus once it has loaded.
  // We poll briefly for `window.botpress` (since the inject script loads
  // asynchronously) and then subscribe to its "webchat:ready" event so we
  // can update the on-page status and, per the requirement that the
  // chatbot loads automatically, open it for the visitor without
  // requiring an extra click.
  let pollAttempts = 0;
  const maxPollAttempts = 100; // ~20s at 200ms intervals

  function waitForBotpress() {
    pollAttempts += 1;

    if (window.botpress && typeof window.botpress.on === 'function') {
      window.botpress.on('webchat:ready', () => {
        setStatus('InterviewAce AI is ready — opening chat…', true);
        openBotpressChat();
      });

      // Some versions fire this instead of / in addition to webchat:ready
      window.botpress.on('conversation', () => {
        setStatus('InterviewAce AI is ready.', true);
      });

      setStatus('InterviewAce AI is ready — click below to chat.', true);
      return;
    }

    if (pollAttempts < maxPollAttempts) {
      window.setTimeout(waitForBotpress, 200);
    } else {
      setStatus('Chat widget is taking longer than usual to load — please refresh.', false);
    }
  }

  waitForBotpress();
})();
