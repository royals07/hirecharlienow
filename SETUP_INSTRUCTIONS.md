# 🚀 Charlie's 90s Website - Setup Guide

## 📧 Setting Up the Contact Form (FREE!)

The contact form uses **Formspree** - a free service that sends form submissions to your email.

### Steps to Activate:

1. **Go to Formspree:**
   - Visit: https://formspree.io
   - Click "Get Started" (it's FREE!)

2. **Sign Up:**
   - Use your email: `hirecharlienow@yahoo.com` OR `charliewoodhead28@gmail.com`
   - Verify your email

3. **Create a Form:**
   - Click "+ New Form"
   - Name it: "Website Contact Form"
   - Click "Create Form"

4. **Get Your Form ID:**
   - You'll see something like: `https://formspree.io/f/xyzabc123`
   - Copy the part after `/f/` (e.g., `xyzabc123`)

5. **Update contact.html:**
   - Open `contact.html`
   - Find this line (around line 27):
     ```html
     <form id="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
     ```
   - Replace `YOUR_FORM_ID` with your actual form ID:
     ```html
     <form id="contact-form" action="https://formspree.io/f/xyzabc123" method="POST">
     ```

6. **Upload to GitHub:**
   - Upload the updated `contact.html` file
   - Done! Now when people fill out the form, you'll get an email! 📧

---

## 📄 CV File

Your CV (`Charlie_Woodhead_-_CV.pdf`) should be renamed to `cv.pdf` and uploaded to GitHub alongside your HTML files.

**Steps:**
1. Rename your CV file to: `cv.pdf`
2. Upload it to your GitHub repository (same folder as index.html)
3. The "Download CV" buttons will work automatically!

---

## 🎨 Files to Upload to GitHub:

1. index.html
2. contact.html ← NEW!
3. guestbook.html
4. tetris.html
5. secret.html
6. 404.html
7. elements.css ← Updated with new cursor!
8. bg-90s.png
9. cv.pdf ← Rename your CV to this!

---

## 🌐 Your Contact Form Features:

✅ Name field (required)
✅ Email field (required)
✅ Phone field (optional)
✅ Company field (optional)
✅ Message field (required, max 1000 chars)
✅ "How did you find me?" dropdown
✅ Character counter for message
✅ Success/error messages
✅ Email sent to: hirecharlienow@yahoo.com

---

## 💡 Formspree Free Plan:

- **50 submissions/month** (more than enough!)
- **Unlimited forms**
- **Email notifications**
- **No credit card required**

If you need more submissions, upgrade to Pro ($10/month) for 1000 submissions.

---

## 🎯 Quick Test:

After setting up:
1. Visit your website
2. Click "Contact Me" button
3. Fill out the form
4. Submit
5. Check your email! 📧

---

## 🆘 Troubleshooting:

**Form not working?**
- Make sure you replaced `YOUR_FORM_ID` with your actual Formspree ID
- Check your Formspree dashboard - did the submission appear there?
- Verify your email in Formspree settings

**Not getting emails?**
- Check spam folder
- Make sure you verified your email with Formspree
- Check Formspree dashboard for submissions

---

Made with 💜 and Comic Sans!
