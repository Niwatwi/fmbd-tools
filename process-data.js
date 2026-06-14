const { createClient } = require('@supabase/supabase-js');
const { Buffer } = require('buffer');

const SUPABASE_URL = 'https://ryqabfpzjmtujfhslovm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5cWFiZnB6am10dWpmaHNsb3ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2MTY4MSwiZXhwIjoyMDkyNTM3NjgxfQ.pMxi2M5D64hHbARdNuZpQXwA9S5hfrOl50H-iS8Wh0o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMasterProcess() {
    console.log("🚀 เริ่มต้นกระบวนการแปลง Base64 แบบดึงทีละก้อน (High Performance)...");

    // ดึง ID สูงสุดมาก่อน เพื่อรู้ว่าต้องวิ่งกี่รอบ
    const { data: maxIdData } = await supabase.from('attendance_logs').select('id').order('id', { ascending: false }).limit(1);
    const maxId = maxIdData ? maxIdData[0].id : 0;

    const BATCH_SIZE = 100; // รอบนี้เอา 100 แถวไปเลยครับ
    let currentId = 1;

    while (currentId <= maxId) {
        console.log(`📡 กำลังตรวจสอบ ID ช่วง: ${currentId} - ${currentId + BATCH_SIZE}...`);

        // ดึงมาแค่ ID และ image_url แบบเรียงตาม ID (ฐานข้อมูลจะทำงานเร็วมาก)
        const { data: batch, error } = await supabase
            .from('attendance_logs')
            .select('id, image_url')
            .gte('id', currentId)
            .lte('id', currentId + BATCH_SIZE);

        if (error) { console.error("ดึงข้อมูลพลาด:", error); break; }
        if (!batch || batch.length === 0) { currentId += BATCH_SIZE; continue; }

        for (const log of batch) {
            // 🟢 เช็กด้วย JavaScript ที่เครื่องพี่ (ไม่พึ่ง Database แล้ว)
            if (log.image_url && log.image_url.startsWith('data:image/')) {
                try {
                    console.log(`🔨 กำลังแปลงรูป ID: ${log.id}`);
                    const base64Data = log.image_url.split(',')[1];
                    const contentType = log.image_url.split(';')[0].split(':')[1];
                    const fileExt = contentType.split('/')[1] || 'png';
                    const buffer = Buffer.from(base64Data, 'base64');
                    const fileName = `attendance/migrated_${log.id}_${Date.now()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('attendance-images')
                        .upload(fileName, buffer, { contentType });

                    if (!uploadError) {
                        const { data } = supabase.storage.from('attendance-images').getPublicUrl(fileName);
                        await supabase.from('attendance_logs').update({ image_url: data.publicUrl }).eq('id', log.id);
                        console.log(`  -> สำเร็จ: ID ${log.id}`);
                    }
                } catch (err) {
                    console.error(`  -> ผิดพลาดที่ ID ${log.id}:`, err.message);
                }
            }
        }

        currentId += BATCH_SIZE + 1;
    }

    console.log("🏁 งานเสร็จเรียบร้อยครับ!");
}

runMasterProcess();