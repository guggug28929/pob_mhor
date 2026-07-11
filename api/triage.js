const FACTS = [
  'chest_pain','dyspnea','severe_dyspnea','cyanosis','unable_speak','unconscious','syncope','confusion','seizure','focal_neuro',
  'diaphoresis','radiating_pain','palpitations','headache','thunderclap','neck_stiffness','abdominal_pain','rigid_abdomen','vaginal_bleeding',
  'fever','cough','sore_throat','drooling','rash','airway_swelling','blister_mucosa','purpura','vomiting','diarrhea','gi_bleeding',
  'unable_drink','dehydration','urinary_symptom','urinary_retention','flank_pain','injury','head_injury','major_bleeding','deformity',
  'loss_function','suicidal','suicide_plan','worsening_fast','immunocompromised','anticoagulant','diabetes','heart_disease','kidney_disease',
  'pregnant','male','female','nausea','photophobia','unilateral_headache','recurrent_similar','tension_pattern','wheeze','productive_cough','orthopnea',
  'itchy_raised_rash','localized_contact_rash','painful_vesicular_rash','hematuria','colicky_flank_pain','exertional_chest_pain','prolonged_chest_pain',
  'reproducible_chest_pain','meal_related_pain','rlq_pain','epigastric_pain','lower_abdominal_pain'
];

const hardStopPatterns = [
  [/หมดสติ|ปลุกไม่ตื่น|ไม่รู้สึกตัว/, 'unconscious', 'ผู้ใช้ระบุว่าหมดสติหรือปลุกไม่ตื่น'],
  [/หายใจไม่ออกเลย|หยุดหายใจ|ตัวเขียว|ปากเขียว/, 'severe_dyspnea', 'ผู้ใช้ระบุภาวะหายใจลำบากรุนแรง'],
  [/ปากเบี้ย|พูดไม่ชัด|อ่อนแรงครึ่งซีก|แขนขาอ่อนแรง/, 'focal_neuro', 'ผู้ใช้ระบุอาการทางระบบประสาทเฉียบพลัน'],
  [/เลือดออกมาก|เลือดพุ่ง|ห้ามเลือดไม่ได้/, 'major_bleeding', 'ผู้ใช้ระบุเลือดออกมากหรือห้ามเลือดไม่ได้'],
  [/มีแผน.*(?:ฆ่าตัวตาย|ทำร้ายตัวเอง)|เตรียม.*(?:ยา|เชือก|มีด|ปืน)/, 'suicide_plan', 'ผู้ใช้ระบุแผนหรืออุปกรณ์ทำร้ายตนเอง']
];

const itemSchema = {
  type: 'object', additionalProperties: false,
  properties: { id: { type: 'string', enum: FACTS }, evidence: { type: 'string' } },
  required: ['id','evidence']
};

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    acknowledgement: { type: 'string' },
    profile: {
      type: 'object', additionalProperties: false,
      properties: {
        age: { type: ['number','null'] }, pregnancy: { type: ['boolean','null'] }, temp: { type: ['number','null'] },
        spo2: { type: ['number','null'] }, sbp: { type: ['number','null'] }, dbp: { type: ['number','null'] },
        hr: { type: ['number','null'] }, severity: { type: ['number','null'] }, duration: { type: ['string','null'] }
      },
      required: ['age','pregnancy','temp','spo2','sbp','dbp','hr','severity','duration']
    },
    present_facts: { type: 'array', items: itemSchema },
    denied_facts: { type: 'array', items: itemSchema },
    uncertain_facts: { type: 'array', items: { type: 'string', enum: FACTS } }
  },
  required: ['acknowledgement','profile','present_facts','denied_facts','uncertain_facts']
};

function getOutputText(data) {
  for (const item of data.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) if (content.type === 'output_text') return content.text;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI is not configured' });
  const message = String(req.body?.message || '').slice(0, 4000).trim();
  if (!message) return res.status(400).json({ error: 'Missing message' });

  for (const [pattern, fact, reason] of hardStopPatterns) {
    if (pattern.test(message)) return res.status(200).json({ hard_stop: true, hard_stop_fact: fact, hard_stop_reason: reason, acknowledgement: 'ข้อความนี้มีสัญญาณอันตรายที่ไม่ควรรอซักประวัติต่อ' });
  }

  const known = req.body?.known || {};
  const instructions = `You extract clinical facts from Thai symptom-triage chat messages. This is data extraction, not diagnosis.\n
Rules:\n- Extract only facts explicitly stated or clearly denied in the latest user message.\n- Understand Thai colloquial language, abbreviations, typos, and negation.\n- Never infer a disease. Never invent vital signs.\n- "หายใจไม่ออก" is a PRESENT dyspnea fact, not a negation.\n- Keep acknowledgement to one short Thai sentence that reflects only what the user said.\n- If a fact is ambiguous, put its id in uncertain_facts rather than present_facts.\n- Do not tell the user that they are safe. The app's deterministic rules decide urgency.`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
        store: false,
        reasoning: { effort: 'low' },
        max_output_tokens: 1200,
        input: [
          { role: 'system', content: instructions },
          { role: 'user', content: `Known state (do not repeat unless reaffirmed): ${JSON.stringify(known)}\nLatest message: ${message}` }
        ],
        text: { format: { type: 'json_schema', name: 'triage_extraction', strict: true, schema } }
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'OpenAI request failed' });
    const output = getOutputText(data);
    if (!output) return res.status(502).json({ error: 'No structured output' });
    return res.status(200).json(JSON.parse(output));
  } catch (error) {
    return res.status(500).json({ error: 'AI interpretation failed' });
  }
}
