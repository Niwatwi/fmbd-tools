const { createClient } = require('@supabase/supabase-js');
const heicConvert = require('heic-convert');

// 1. ตั้งค่าการเชื่อมต่อ Supabase ของพี่นิวัต (ใส่คีย์จริงของพี่ได้เลยครับ)
const SUPABASE_URL = 'https://ryqabfpzjmtujfhslovm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5cWFiZnB6am10dWpmaHNsb3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjE2ODEsImV4cCI6MjA5MjUzNzY4MX0.D2DKpUHQgZmcc_XCTa1wbV0Yak9HCGy1OJHptpQFato';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET_NAME = 'oos-images';

async function startRecovery() {
    console.log('🚀 เริ่มต้นระบบกู้คืนไฟล์รูปภาพด้วยระบบ Time-Chunking (สแกนทีละ 7 วัน)...');

    // ตั้งค่าวันที่เริ่มต้นสแกน (พี่นิวัตสามารถขยับเป็น '2024-01-01' ได้ถ้าต้องการตรวจย้อนหลังไปอีกครับ)
    let startDate = new Date('2026-06-09');
    const today = new Date('2026-06-10');

    let totalProcessed = 0;
    let totalFixed = 0;

    // วิ่งลูปขยับเวลาทีละ 7 วัน ไปจนถึงวันนี้ในปี 2026
    while (startDate < today) {
        // คำนวณวันสิ้นสุดของรอบนี้ (บวกไป 7 วัน)
        let endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        console.log(`\n📅 ช่วงวันที่: [${startStr}] ถึง [${endStr}] กำลังสแกนตรวจสอบ...`);

        // ดึงข้อมูลในรอบ 7 วันนี้มาคัดกรอง (ดึงสูงสุดรอบละ 4,000 แถว ป้องกันข้อมูลหล่นหาย)
        const { data: periodData, error: fetchError } = await supabase
            .from('oos_items')
            .select('id, price_tag_image, shelf_image, cma_image')
            .gte('created_at', startStr)
            .lt('created_at', endStr)
            .limit(4000);

        if (fetchError) {
            console.error(`❌ เกิดข้อผิดพลาดในช่วงวันที่ ${startStr}:`, fetchError.message);
            // ขยับรอบเวลาต่อไปแม้รอบนี้จะพลาด เพื่อไม่ให้ระบบหยุดชะงัก
            startDate = endDate;
            continue;
        }

        if (periodData && periodData.length > 0) {
            // คัดกรองหาแถวที่มีไฟล์ .heic แฝงอยู่ด้วย JavaScript หลังบ้าน
            const brokenRows = periodData.filter(row => {
                return (row.price_tag_image && row.price_tag_image.toLowerCase().endsWith('.heic')) ||
                    (row.shelf_image && row.shelf_image.toLowerCase().endsWith('.heic')) ||
                    (row.cma_image && row.cma_image.toLowerCase().endsWith('.heic'));
            });

            if (brokenRows.length > 0) {
                console.log(`   📸 ตรวจพบรูปแตกในสัปดาห์นี้ ${brokenRows.length} รายการ กำลังซ่อมแซม...`);

                for (const row of brokenRows) {
                    const imageFields = ['price_tag_image', 'shelf_image', 'cma_image'];
                    const updatePayload = {};

                    for (const field of imageFields) {
                        const imageUrl = row[field];

                        if (imageUrl && imageUrl.toLowerCase().endsWith('.heic')) {
                            // แยกเอาเฉพาะชื่อพาธไฟล์ใน Storage Bucket
                            const parts = imageUrl.split(`/public/${BUCKET_NAME}/`);
                            const heicPath = parts.length > 1 ? parts[1] : null;

                            if (!heicPath) continue;

                            try {
                                // A. ดาวน์โหลดก้อนไฟล์ .heic มาที่เครื่องคอมพิวเตอร์
                                const { data: fileBlob, error: downloadError } = await supabase.storage
                                    .from(BUCKET_NAME)
                                    .download(heicPath);

                                if (downloadError) throw downloadError;

                                const arrayBuffer = await fileBlob.arrayBuffer();
                                const heicBuffer = Buffer.from(arrayBuffer);

                                // B. แปลงโค้ดภาพเป็นระบบ JPEG มาตรฐานเว็บ
                                const jpgBuffer = await heicConvert({
                                    buffer: heicBuffer,
                                    format: 'JPEG',
                                    quality: 0.8
                                });

                                const jpgPath = heicPath.replace(/\.heic$/i, '.jpg');

                                // C. อัปโหลดรูปภาพที่กู้เสร็จแล้วขึ้น Storage
                                const { error: uploadError } = await supabase.storage
                                    .from(BUCKET_NAME)
                                    .upload(jpgPath, jpgBuffer, {
                                        contentType: 'image/jpeg',
                                        cacheControl: '3600',
                                        upsert: true
                                    });

                                if (uploadError) throw uploadError;

                                const { data: urlData } = supabase.storage
                                    .from(BUCKET_NAME)
                                    .getPublicUrl(jpgPath);

                                updatePayload[field] = urlData.publicUrl;

                                // D. ลบไฟล์ .heic เก่าทิ้งเพื่อประหยัดพื้นที่คลาวด์
                                await supabase.storage.from(BUCKET_NAME).remove([heicPath]);
                                totalFixed++;

                            } catch (err) {
                                console.error(`      ❌ ID ${row.id} [${field}] ซ่อมไม่สำเร็จ:`, err.message);
                            }
                        }
                    }

                    // อัปเดตลิงก์ใหม่ในตารางให้ชี้ไปที่ .jpg ตัวที่ซ่อมเสร็จ
                    if (Object.keys(updatePayload).length > 0) {
                        const { error: updateError } = await supabase
                            .from('oos_items')
                            .update(updatePayload)
                            .eq('id', row.id);

                        if (!updateError) {
                            console.log(`      ✅ ID ${row.id}: แปลงไฟล์และอัปเดต URL สำเร็จ`);
                        }
                    }
                }
            }
            totalProcessed += periodData.length;
        }

        // 🟢 ขยับเวลาไปอีก 7 วันเพื่อทำรอบถัดไป
        startDate = endDate;
    }

    console.log(`\n🎉 เสร็จสิ้นกระบวนการกู้คืนรูปภาพทั้งหมดแล้วครับพี่นิวัต!`);
    console.log(`📊 รวมจำนวนแถวที่ตรวจสอบผ่านระบบคัดกรอง: ${totalProcessed.toLocaleString()} แถว`);
    console.log(`🛠 ซ่อมแซมชุบชีวิตรูปภาพที่แตกสำเร็จทั้งหมด: ${totalFixed.toLocaleString()} รูป`);
}

startRecovery();