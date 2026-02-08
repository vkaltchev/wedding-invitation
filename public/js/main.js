// Wedding Invitation - Main JavaScript

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  initScrollAnimations();
  initForm();
  initParallax();
});

// Load configuration and apply to page
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    applyConfig(config);
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

function applyConfig(config) {
  // Apply theme colors as CSS variables
  const root = document.documentElement;
  const theme = config.theme;

  if (theme) {
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--background-color', theme.backgroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--hero-background', theme.heroBackground);

    if (theme.fontFamily) {
      root.style.setProperty('--font-display', theme.fontFamily);
    }
  }

  // Apply couple names
  if (config.couple) {
    setText('name1', config.couple.name1);
    setText('name2', config.couple.name2);
    setText('footerName1', config.couple.name1);
    setText('footerName2', config.couple.name2);
  }

  // Apply event details
  if (config.event) {
    setText('eventDate', config.event.date);
    setText('detailDate', config.event.date);
    setText('detailTime', config.event.time);
    setText('detailVenue', config.event.venue);
    setText('detailAddress', config.event.address);
    setText('detailDressCode', config.event.dressCode);

    // Update page title
    if (config.couple) {
      document.title = `${config.couple.name1} & ${config.couple.name2} - ${config.event.type} Invitation`;
    }
  }

  // Apply content
  if (config.content) {
    setText('heroSubtitle', config.content.heroSubtitle);
    setText('storyTitle', config.content.storyTitle);
    setText('storyText', config.content.story);
    setText('detailsTitle', config.content.detailsTitle);
    setText('rsvpTitle', config.content.rsvpTitle);
    setText('rsvpSubtitle', config.content.rsvpSubtitle);
    setText('closingMessage', config.content.closingMessage);
  }
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element && text) {
    element.textContent = text;
  }
}

// Scroll Animations using Intersection Observer
function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Optionally stop observing after animation
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all animated elements
  const animatedElements = document.querySelectorAll('.animate-on-scroll, .slide-in-left, .slide-in-right, .scale-in');
  animatedElements.forEach(el => observer.observe(el));
}

// Parallax effect for hero section
function initParallax() {
  const hero = document.querySelector('.hero');
  const heroContent = document.querySelector('.hero-content');

  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * 0.3;

    if (heroContent && scrolled < window.innerHeight) {
      heroContent.style.transform = `translateY(${rate}px)`;
      heroContent.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
    }
  });
}

// Form handling
function initForm() {
  const form = document.getElementById('rsvpForm');
  const guestCountGroup = document.getElementById('guestCountGroup');
  const attendingRadios = document.querySelectorAll('input[name="attending"]');
  const successMessage = document.getElementById('successMessage');

  // Toggle guest count visibility based on attendance
  attendingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'yes' || e.target.value === 'maybe') {
        guestCountGroup.classList.add('active');
      } else {
        guestCountGroup.classList.remove('active');
      }
    });
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      guest_name: formData.get('guest_name'),
      email: formData.get('email'),
      attending: formData.get('attending'),
      guest_count: parseInt(formData.get('guest_count')) || 1,
      dietary: formData.get('dietary'),
      message: formData.get('message')
    };

    // Disable submit button
    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Sending...</span>';

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        // Show success message
        form.classList.add('hidden');
        successMessage.classList.remove('hidden');

        // Scroll success message into view
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit RSVP. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Send RSVP</span>';
      }
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      alert('Failed to submit RSVP. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Send RSVP</span>';
    }
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
