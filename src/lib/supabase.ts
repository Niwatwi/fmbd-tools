import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 💡 ใส่ log ตรงนี้เพื่อเช็คว่า Next.js โหลดค่ามาได้ไหม
console.log("DEBUG Supabase URL:", supabaseUrl);
console.log("DEBUG Supabase Key:", supabaseAnonKey ? "Loaded" : "Missing");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL หรือ KEY ยังโหลดไม่ติดครับพี่!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
