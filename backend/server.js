const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

app.post('/api/send-photo', async (req, res) => {
  const { email, imageData, frameTitle } = req.body;

  if (!email || !imageData) {
    return res.status(400).json({ success: false, message: '이메일과 사진 데이터가 필요합니다.' });
  }

  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  try {
    let transporter;
    if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com') {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      console.log('⚠️ 실제 SMTP 정보가 설정되지 않아 테스트용 Ethereal 계정을 사용합니다.');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Aero Purikura Booth" <purikura@aero.space>',
      to: email,
      subject: `✨ [Aero Purikura] 촬영하신 프리쿠라 사진이 도착했습니다! (${frameTitle || 'Memorial'})`,
      html: `
        <div style="background: linear-gradient(180deg, #e3f6ff 0%, #b2e3ff 100%); padding: 30px; font-family: sans-serif; text-align: center;">
          <div style="background: rgba(255, 255, 255, 0.9); max-width: 500px; margin: 0 auto; padding: 25px; border-radius: 16px; border: 2px solid #ffffff; box-shadow: 0 10px 25px rgba(0, 120, 215, 0.25);">
            <h1 style="color: #0078d7; margin-bottom: 8px;">🫧 Aero Purikura Photo Booth 🫧</h1>
            <p style="color: #444; font-size: 14px;">에어로 푸르티거 감성으로 완성한 프리쿠라 사진입니다.</p>
            <div style="margin: 20px 0; padding: 8px; background: #ffffff; border-radius: 10px;">
              <img src="cid:purikura_image" alt="Purikura Photo" style="max-width: 100%; height: auto; border-radius: 6px;" />
            </div>
            <p style="color: #777; font-size: 12px;">첨부파일로 원본 고화질 이미지를 다운로드하실 수 있습니다.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `aero_purikura_${Date.now()}.png`,
          content: buffer,
          cid: 'purikura_image'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('이메일 발송 성공:', info.messageId);
    
    let previewUrl = null;
    if (nodemailer.getTestMessageUrl(info)) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('테스트 메일 링크:', previewUrl);
    }

    res.json({
      success: true,
      message: '이메일이 성공적으로 발송되었습니다!',
      previewUrl: previewUrl
    });
  } catch (error) {
    console.error('메일 전송 오류:', error);
    res.status(500).json({
      success: false,
      message: '메일 발송 오류: ' + error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🐬 Aero Purikura 백엔드 서버가 http://localhost:${PORT} 포트에서 구동 중입니다.`);
});
