/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Store,
  MapPin,
  Save,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Mail,
  Phone,
  Image as ImageIcon,
  Compass,
  ChevronDown,
} from "lucide-react";

// 🏢 เปิดจุดเชื่อมต่อฐานข้อมูล Supabase
const _supabase = createClient(
  "https://ryqabfpzjmtujfhslovm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5cWFiZnB6am10dWpmaHNsb3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjE2ODEsImV4cCI6MjA5MjUzNzY4MX0.D2DKpUHQgZmcc_XCTa1wbV0Yak9HCGy1OJHptpQFato",
);

// 🗺️ รายการมาสเตอร์เขตพื้นที่ปฏิบัติงานตามโจทย์ของพี่นิวาส
const AREA_OPTIONS = ["K01", "K02", "K03", "K04", "K05", "K06", "K07", "K08"];

export default function AddStorePage() {
  const router = useRouter();

  // UI States
  const [currentTime, setCurrentTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [loginName, setLoginName] = useState("");

  // 📝 🧠 คลังเก็บรายชื่อตัวเลือก Account ดึงสดจากฐานข้อมูลหลังบ้าน
  const [masterAccounts, setMasterAccounts] = useState<string[]>([]);

  // 📝 States สำหรับกรอกโครงสร้างโมเดลร้านค้า
  const [storeCode, setStoreCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [area, setArea] = useState(""); // Dropdown K01 - K08
  const [channel, setChannel] = useState(""); // Dropdown MT / TT
  const [account, setAccount] = useState(""); //พิมพ์เพิ่มเองได้ + มี Auto-suggest
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // 📷 คลังไฟล์รูปหน้าร้าน
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // 🕒 1. ระบบจัดการเวลาแบนเนอร์ Real-time
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " น.",
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔄 2. ตรวจสอบเซสชันผู้ใช้งาน + โหลดมาสเตอร์ Account อัตโนมัติ
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (!storedName) {
      router.push("/login");
      return;
    }
    setLoginName(storedName);

    fetchUniqueAccounts();
  }, [router]);

  // 🛰️ 🧠 ฟังก์ชันสแกนดึงรายชื่อกลุ่มห้าง/ผู้แทนจำหน่าย (Account) ที่เคยมีในตารางมาทำ Suggestion
  const fetchUniqueAccounts = async () => {
    try {
      const { data, error } = await _supabase.from("stores").select("account");

      if (error) throw error;

      if (data && data.length > 0) {
        // คัดเอาเฉพาะค่าที่ไม่ซ้ำกัน และตัดค่าว่างทิ้ง
        const uniqueAccounts = Array.from(
          new Set(data.map((s) => s.account).filter(Boolean)),
        );
        setMasterAccounts(uniqueAccounts);
      }
    } catch (err: any) {
      console.warn(
        "⚠️ แจ้งเตือนสแกนคลังข้อมูล Account เบื้องต้น:",
        err.message,
      );
    }
  };

  // 📡 3. ฟังก์ชันดึงพิกัด GPS ปัจจุบันจากดาวเทียม
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire(
        "ไม่รองรับระบบ",
        "เบราว์เซอร์ของพี่ไม่รองรับการดึงพิกัด GPS ครับ",
        "error",
      );
      return;
    }

    setIsGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setIsGettingGPS(false);
        Swal.fire({
          icon: "success",
          title: "จับพิกัดสำเร็จ!",
          text: `ลัต: ${position.coords.latitude}, ลอง: ${position.coords.longitude}`,
          timer: 1500,
          showConfirmButton: false,
        });
      },
      (error) => {
        console.error(error);
        setIsGettingGPS(false);
        Swal.fire(
          "ดึงพิกัดล้มเหลว",
          "โปรดกดอนุญาตสิทธิ์ตำแหน่งพิกัด (Location) บนเบราว์เซอร์ก่อนครับ",
          "warning",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview("");
  };

  // 🚀 4. ระบบอัปโหลดรูปภาพหน้าร้านเข้าคลัง Storage
  const uploadStoreImage = async () => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `store_${storeCode.trim() || "new"}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await _supabase.storage
      .from("store-images")
      .upload(`stores/${fileName}`, imageFile);

    if (uploadError)
      throw new Error(`รูปภาพหน้าร้านมีปัญหา: ${uploadError.message}`);

    const { data: urlData } = _supabase.storage
      .from("store-images")
      .getPublicUrl(`stores/${fileName}`);

    return urlData.publicUrl;
  };

  // 💾 5. ลอจิกส่งข้อมูลลงตาราง 'stores'
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim() || !area || !channel || !account.trim()) {
      Swal.fire(
        "ข้อมูลไม่ครบถุมบูรณ์",
        "โปรดกรอกข้อมูลร้านค้า เขต ช่องทาง และห้างให้ครบถ้วนก่อนครับ",
        "warning",
      );
      return;
    }

    setIsSubmitting(true);
    Swal.fire({
      title: "กำลังขึ้นทะเบียนร้านค้า...",
      text: "ระบบกำลังเซฟพิกัดและรูปถ่ายหน้าร้านลงฐานข้อมูล ห้ามปิดหน้าจอครับพี่",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const storeImageUrl = await uploadStoreImage();

      // 🎯 แพ็กเกจข้อมูลยิงลงคอลัมน์ตารางตามโจทย์ใหม่เป๊ะๆ ครับพี่นิวาส
      const storeRecord = {
        store_code: storeCode.trim() || null,
        store_name: storeName.trim(),
        area: area, // บันทึกตัวเลือก K01 - K08
        chanel: channel, // ⬅️ ยิงเข้าคอลัมน์ chanel (พิมพ์สะกดตามที่ระบุ) ด้วยค่า MT / TT
        account: account.trim(), // บันทึกชื่อห้าง (ค่าเก่าในมาสเตอร์ หรือ พิมพ์ใหม่เอง)
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        img_store: storeImageUrl,
        is_active: true,
      };

      const { error } = await _supabase.from("stores").insert([storeRecord]);
      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "ขึ้นทะเบียนร้านค้าสำเร็จ!",
        text: `บันทึกร้าน ${storeName} เข้าสู่ระบบเรียบร้อยแล้วครับพี่นิวาส`,
        confirmButtonColor: "#005bb7",
      }).then(() => {
        router.push("/");
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire("เกิดข้อผิดพลาด", err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#EBF3FA] via-[#F3F7FA] to-[#E8EFF5] font-sans pb-12 text-slate-800">
      {/* 🏢 DATALIST FOR ACCOUNT SUGGESTIONS (คลังตัวเลือกห้างดึงสดอัตโนมัติ) */}
      <datalist id="master-accounts-list">
        {masterAccounts.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {/* HEADER BAR */}
      <header className="bg-white/90 backdrop-blur-md border-b border-white/60 py-4 px-4 sticky top-0 z-50 shadow-[0_10px_30px_rgba(0,91,183,0.06)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-bold text-xs bg-white border border-slate-200 hover:border-blue-400 px-3 py-2 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] active:translate-y-0.5"
            >
              ← กลับหน้าหลัก
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] active:translate-y-0.5"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3.5 bg-gradient-to-r from-white via-slate-50/50 to-blue-50/40 p-3.5 rounded-2xl border border-white shadow-[4px_4px_12px_rgba(0,0,0,0.02)]">
            <div className="flex-1">
              <h1 className="text-sm font-black bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 bg-clip-text text-transparent tracking-tight">
                Riverpro Intertrade Co., Ltd
              </h1>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-extrabold text-slate-500">
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/60 shadow-sm">
                  👤 เจ้าหน้าที่ผู้บันทึก: {loginName || "..."}
                </span>
                <span className="text-indigo-600 font-mono">
                  🕒 {currentTime}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-[3px] w-full rounded-full mt-1"></div>
        </div>
      </header>

      {/* MAIN FORM */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        <form onSubmit={handleSaveStore} className="space-y-6">
          {/* ข้อมูลร้านค้าทั่วไป */}
          <section className="bg-white/95 border border-white/80 rounded-[28px] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03),4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-[11px] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 rounded-xl shadow-[0_4px_12_rgba(0,91,183,0.25)] inline-block uppercase tracking-wider">
                <Store className="w-3.5 h-3.5 inline mr-1" /> ส่วนที่ 1:
                ข้อมูลสาขาร้านค้ามาสเตอร์
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* รหัสร้านค้า */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  รหัสร้านค้า (Store Code / ถ้ามี)
                </label>
                <input
                  type="text"
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value)}
                  placeholder="เช่น CUST-0123"
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
                />
              </div>

              {/* ชื่อร้านค้า */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ชื่อร้านค้า / สาขา (Store Name) *
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="เช่น บิ๊กซี ซูเปอร์เซ็นเตอร์ สาขาคลองหลวง"
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
                  required
                />
              </div>

              {/* 💡 เขตพื้นที่ (Area) ปรับเปลี่ยนเป็น Dropdown เลือก K01 - K08 แล้วครับพี่นิวาส */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  เขตพื้นที่ปฏิบัติงาน (Area) *
                </label>
                <div className="relative">
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:border-blue-500 outline-none shadow-inner transition-all appearance-none pr-8"
                    required
                  >
                    <option value="">-- เลือกเขตพื้นที่ (K01 - K08) --</option>
                    {AREA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* 💡 เพิ่มช่องทางสินค้า (Channel) ตัวเลือก MT / TT บันทึกลงฟิลด์ chanel */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ช่องทางหลักหน้าร้าน (Channel) *
                </label>
                <div className="relative">
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:border-blue-500 outline-none shadow-inner transition-all appearance-none pr-8"
                    required
                  >
                    <option value="">-- เลือกช่องทางจัดจำหน่าย --</option>
                    <option value="MT">MT (Modern Trade)</option>
                    <option value="TT">TT (Traditional Trade)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* 💡 ผู้แทนจำหน่าย / ห้าง (Account) ดึงข้อมูลเสนออัตโนมัติ และเปิดให้คีย์เพิ่มกรณีเจอห้างใหม่แกะกล่อง */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ผู้แทนจำหน่าย / ห้างหลัก (Account) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    list="master-accounts-list" // ดึง Suggestion ลิสต์จากหลังบ้านมาดักไว้ให้เลือกครับ
                    placeholder="เลือกจากมาสเตอร์ หรือพิมพ์ระบุห้างใหม่ที่นี่..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                    required
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          {/* ระบบพิกัดตำแหน่งและรูปถ่ายหน้าร้าน */}
          <section className="bg-white/95 border border-white/80 rounded-[28px] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03),4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-[11px] font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 rounded-xl shadow-[0_4px_12_rgba(16,185,129,0.25)] inline-block uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 inline mr-1" /> ส่วนที่ 2:
                พิกัดจีพีเอสและสื่อหน้าร้าน
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ละติจูด (Latitude)
                </label>
                <input
                  type="text"
                  value={latitude}
                  placeholder="กดปุ่มสแกนพิกัดด้านล่าง..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-mono font-bold bg-slate-100 outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ลองจิจูด (Longitude)
                </label>
                <input
                  type="text"
                  value={longitude}
                  placeholder="กดปุ่มสแกนพิกัดด้านล่าง..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-mono font-bold bg-slate-100 outline-none"
                  readOnly
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGettingGPS}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-amber-400 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:translate-y-0.5 disabled:opacity-60"
                >
                  <Compass
                    className={`w-4 h-4 ${isGettingGPS ? "animate-spin" : ""}`}
                  />
                  {isGettingGPS
                    ? "กำลังติดต่อดาวเทียมเพื่อพาดพิกัด..."
                    : "คลิกจับค่าพิกัดพิกัด GPS หน้าร้านปัจจุบัน"}
                </button>
              </div>

              {/* อัปโหลดรูปภาพหน้าร้าน */}
              <div className="sm:col-span-2 space-y-1 pt-2">
                <label className="text-[11px] font-black text-slate-600 block pl-1">
                  ภาพถ่ายประกอบหน้าร้าน (Store Image)
                </label>
                <div
                  onClick={() =>
                    document.getElementById("store-file-input")?.click()
                  }
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer min-h-[140px] flex flex-col items-center justify-center transition-all bg-slate-50/50 relative group overflow-hidden ${imagePreview ? "border-orange-500 bg-orange-50/10 shadow-sm" : "border-slate-200 hover:border-blue-400"}`}
                >
                  {imagePreview ? (
                    <div className="w-full h-full flex items-center justify-center relative">
                      <img
                        src={imagePreview}
                        alt="Store Preview"
                        className="max-h-[120px] object-contain rounded-xl shadow border border-white"
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute top-0.5 right-0.5 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md z-10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-slate-400 group-hover:scale-110 group-hover:text-blue-500 transition-all mb-1" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                        คลิกเพื่อถ่ายภาพ หรือ อัปโหลดรูปภาพหน้าร้าน
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="store-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white font-black py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,91,183,0.3)] hover:shadow-[0_6px_25px_rgba(0,91,183,0.4)] transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                "กำลังบันทึกข้อมูล..."
              ) : (
                <>
                  <Save className="w-4 h-4" />{" "}
                  บันทึกและขึ้นทะเบียนร้านค้าเข้าคลังข้อมูลมาสเตอร์กลาง
                </>
              )}
            </button>
          </section>
        </form>
      </main>
      {/* FOOTER */}
      <footer className="max-w-4xl mx-auto px-4 mt-20 text-center space-y-6 pb-12 font-sans text-slate-600">
        {/* เส้นคั่นบนขอบเขตเนื้อหาไล่เฉดสีอย่างนุ่มนวล */}
        <div className="bg-gradient-to-r from-transparent via-slate-300 to-transparent h-[1px] w-full"></div>

        {/* บล็อกการ์ดข้อมูลผู้ควบคุมระบบสไตล์ Minimal Professional */}
        <div className="flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-md border border-white/70 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] max-w-lg mx-auto transition-all hover:border-blue-200">
          {/* ฝั่งหัวข้อตำแหน่งควบคุมงาน */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-blue-700">
              <ShieldCheck className="w-4 h-4 text-blue-600 animate-pulse" />
              <h4 className="text-[10px] font-black tracking-[0.15em] uppercase">
                FMBD CONTROLLER
              </h4>
            </div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              Niwat Wiyasing
            </h3>
          </div>

          {/* ช่องทางการติดต่อฝังไอคอน Interactive ลิงก์กดโทรออก/ส่งเมล์ได้ทันที */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
            {/* ✉️ ส่งอีเมล */}
            <a
              href="mailto:Niwat_wiy@riverpro.co.th"
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors bg-white/60 px-3 py-1.5 rounded-xl border border-slate-200/50 hover:border-blue-300 shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-600">
                Niwat_wiy@riverpro.co.th
              </span>
            </a>

            {/* 📞 โทรศัพท์ */}
            <a
              href="tel:0658064694"
              className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors bg-white/60 px-3 py-1.5 rounded-xl border border-slate-200/50 hover:border-emerald-300 shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-600">065-806-4694</span>
            </a>
          </div>
        </div>

        {/* บรรทัดประกาศลิขสิทธิ์ระดับองค์กร */}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] pt-2">
          © {new Date().getFullYear()} Riverpro Intertrade Co., Ltd. All Rights
          Reserved.
        </p>
      </footer>
    </div>
  );
}
