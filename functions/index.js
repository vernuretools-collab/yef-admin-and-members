const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2"); // ✅ added

admin.initializeApp();

// ✅ FIX: setGlobalOptions handles CORS for all v2 functions
setGlobalOptions({
  region: "us-central1",
  cors: true,
});

const getGmailUser = () => process.env.GMAIL_USER;
const getGmailPass = () => process.env.GMAIL_APP_PASSWORD;
const getGmailFrom = () => `YEF Network <${process.env.GMAIL_USER}>`; // ✅ fixed — was calling undefined getGmailFrom()

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

exports.createMember = onCall(
  {
    // ✅ region + cors moved to setGlobalOptions above
    secrets: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const data = request.data || {};
    const name = (data.name || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    const business = (data.business || "").trim();
    const industry = (data.industry || "").trim();

    if (!name) {
      throw new HttpsError("invalid-argument", "Name is required.");
    }

    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email is required.");
    }

    const GMAIL_USER = getGmailUser();
    const GMAIL_APP_PASSWORD = getGmailPass();
    const GMAIL_FROM = getGmailFrom(); // ✅ now works correctly

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new HttpsError(
        "internal",
        "Missing Gmail configuration in environment variables."
      );
    }

    let uid = null;

    try {
      const userRecord = await admin.auth().createUser({
        email,
        displayName: name,
        emailVerified: false,
        disabled: false,
      });

      uid = userRecord.uid;

      const currentYear = new Date().getFullYear().toString();
      const avatarInitials = name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      await admin.firestore().collection("users").doc(uid).set({
        uid,
        email,
        name,
        business: business || "",
        industry: industry || "",
        role: "member",
        status: "active",
        memberSince: currentYear,
        avatarInitials,
        attendanceRate: 0,
        ceuPoints: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await admin.firestore().collection("palms").doc(uid).set({
        uid,
        referrals: 0,
        attendance: 0,
        oneToOne: 0,
        tyfcb: 0,
        ceu: 0,
      });

      const actionCodeSettings = {
        url: "https://app.yef-network.com/login",
        handleCodeInApp: false,
      };

      const resetLink = await admin
        .auth()
        .generatePasswordResetLink(email, actionCodeSettings);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD,
        },
      });

      const safeName = escapeHtml(name);
      const safeBusiness = escapeHtml(business);
      const safeEmail = escapeHtml(email);
      const safeIndustry = escapeHtml(industry);
      const safeResetLink = escapeHtml(resetLink);

      await transporter.sendMail({
        from: GMAIL_FROM,
        to: email,
        subject: "Welcome to YEF Network — Set Your Password",
        text: `Hi ${name},

Your member account has been created successfully.

${business ? `Business: ${business}\n` : ""}Email: ${email}
${industry ? `Industry: ${industry}\n` : ""}

Set your password using the link below:
${resetLink}

After setting your password, you can log in at:
https://app.yef-network.com/login

Thank you,
YEF Network Admin Team`,

        html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1d2e; max-width: 600px; margin: auto; padding: 24px; background: #ffffff;">

  <div style="background: #1B2E6B; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Welcome to YEF Network</h1>
  </div>

  <div style="background: #f9fafc; padding: 28px; border: 1px solid #e0e3ef; border-top: none; border-radius: 0 0 12px 12px;">

    <p style="margin: 0 0 16px; font-size: 15px;">Hi <strong>${safeName}</strong>,</p>
    <p style="margin: 0 0 20px; font-size: 15px;">
      Your member account has been created successfully. Use the button below to set your password and access the portal.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px; background: #ffffff; border: 1px solid #e0e3ef; border-radius: 8px; overflow: hidden;">
      ${business ? `
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; color: #5c607a; border-bottom: 1px solid #eef0f7; width: 35%;">Business</td>
        <td style="padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #eef0f7;">${safeBusiness}</td>
      </tr>` : ""}
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; color: #5c607a; border-bottom: 1px solid #eef0f7;">Email</td>
        <td style="padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #eef0f7;">${safeEmail}</td>
      </tr>
      ${industry ? `
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; color: #5c607a;">Industry</td>
        <td style="padding: 10px 14px; font-size: 13px;">${safeIndustry}</td>
      </tr>` : ""}
    </table>

    <div style="text-align: center; margin: 0 0 24px;">
      <a href="${resetLink}"
        style="display: inline-block; background: #1B2E6B; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.01em;">
        Set My Password
      </a>
    </div>

    <p style="margin: 0 0 8px; font-size: 13px; color: #5c607a;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 0 0 24px; font-size: 12px; color: #9ea3ba; word-break: break-all;">
      ${safeResetLink}
    </p>

    <hr style="border: none; border-top: 1px solid #eef0f7; margin: 0 0 20px;" />

    <p style="margin: 0; font-size: 13px; color: #9ea3ba;">
      This link expires in 24 hours. If you did not expect this email, please ignore it.<br/>
      &mdash; YEF Network Admin Team
    </p>

  </div>
</div>`,
      });

      return { uid, success: true };
    } catch (err) {
      // Rollback: delete Firebase Auth user if Firestore/email failed
      if (uid) {
        try {
          await admin.auth().deleteUser(uid);
        } catch (rollbackErr) {
          console.error("Rollback failed:", rollbackErr);
        }
      }

      console.error("createMember error:", err);

      if (err.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "This email is already registered.");
      }

      throw new HttpsError(
        "internal",
        err.message || "Failed to create member account."
      );
    }
  }
);

const incrementMemberTotals = async (uid, type, amount) => {
  if (!uid || !type || !amount) return
  const palmsKey = type === "oneToOne" ? "oneToOne" : type
  const db = admin.firestore()
  const now = admin.firestore.FieldValue.serverTimestamp()
  const delta = admin.firestore.FieldValue.increment(amount)

  await db.collection("memberSlips").doc(uid).set(
    { [type]: delta, uid, updatedAt: now },
    { merge: true }
  )
  await db.collection("palms").doc(uid).set(
    { [palmsKey]: delta, uid, updatedAt: now },
    { merge: true }
  )
}

exports.deleteMemberSlip = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.")
  }

  const id = (request.data && request.data.id) || ""
  if (!id) {
    throw new HttpsError("invalid-argument", "Slip id is required.")
  }

  const db = admin.firestore()
  const ref = db.collection("referrals").doc(id)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new HttpsError("not-found", "This slip was already removed.")
  }

  const row = snap.data() || {}
  const uid = request.auth.uid
  const fromUid = row.fromUid || row.from || null
  if (fromUid !== uid) {
    throw new HttpsError("permission-denied", "You can only delete slips you logged.")
  }

  const type = row.historyType || row.type || "referrals"
  const toUid = row.toUid || null
  const applyPalms = Boolean(row.historyType)

  try {
    if (applyPalms && type === "tyfcb") {
      const amount = Number(row.amount) || Number(row.details && row.details.amount) || 0
      if (amount) await incrementMemberTotals(fromUid, "tyfcb", -amount)
      const linked = await db.collection("referrals").where("tyfcbId", "==", id).get()
      await Promise.all(linked.docs.map((d) => d.ref.update({ tyfcbId: null })))
    }

    if (applyPalms && (type === "referrals" || type === "oneToOne" || type === "visitors")) {
      await incrementMemberTotals(fromUid, type, -1)
      if (toUid && toUid !== fromUid) await incrementMemberTotals(toUid, type, -1)
    }

    await ref.delete()
    return { success: true }
  } catch (err) {
    console.error("deleteMemberSlip error:", err)
    throw new HttpsError("internal", err.message || "Failed to delete slip.")
  }
})
