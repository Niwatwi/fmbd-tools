/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase";
import {
  MapPin,
  Camera,
  User,
  Home,
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react";

interface StoreData {
  id: number;
  area: string;
  mer_code: string;
  chanel: string;
  account: string;
  store_name: string;
  province: string;
  region: string;
  store_code: string;
  store_img: string;
  store_type: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  is_active: boolean;
}

export default function CheckinPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState("");
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [isCheckIn, setIsCheckIn] = useState(false);
  const [isCheckOut, setIsCheckOut] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // สเตทสำหรับ Dropdown Chanel และ Account
  const [selectedChanel, setSelectedChanel] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");

  const [deviceLat, setDeviceLat] = useState<number | null>(null);
  const [deviceLng, setDeviceLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState("กำลังตรวจสอบสิทธิ์ GPS...");
  const [isGpsReady, setIsGpsReady] = useState(false);

  const [userCode, setUserCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyTag, setCompanyTag] = useState("");
  const [todayHistory, setTodayHistory] = useState<any[]>([]);

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `attendance/${userCode}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("attendance-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("attendance-images")
        .getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("เบราว์เซอร์ไม่รองรับ GPS");
      return;
    }

    setIsGpsReady(false);
    setGpsStatus("กำลังจับพิกัดดาวเทียม...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLat(position.coords.latitude);
        setDeviceLng(position.coords.longitude);
        setGpsStatus("ยืนยันพิกัดเรียบร้อย");
        setIsGpsReady(true);
      },
      (error) => {
        setIsGpsReady(false);
        const ua = navigator.userAgent.toLowerCase();
        const isLine = ua.includes("line");
        const isIOS = /iphone|ipad|ipod/.test(ua);

        if (isLine && isIOS) {
          // แจ้งเตือนสถานะในกล่องข้อความเฉยๆ ไม่ล็อกหน้าจอพนักงานตามเงื่อนไขใหม่ครับพี่
          setGpsStatus(
            "⚠️ สัญญาณผ่าน LINE iOS (หากพิกัดคลาดเคลื่อนแนะนำเปิดใน Safari)",
          );
          setIsGpsReady(true); // ปลดล็อกให้กดบันทึกผ่านเบราว์เซอร์ LINE ได้ง่ายขึ้น
        } else if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus(
            "❌ ถูกปฏิเสธสิทธิ์เข้าถึงตำแหน่ง (โปรดเปิดสิทธิ์ใน Setting)",
          );
        } else {
          setGpsStatus("❌ ไม่สามารถจับพิกัดได้ (โปรดเช็คสัญญาณ GPS)");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  useEffect(() => {
    fetchCurrentLocation();
    const storedUsername = localStorage.getItem("userCode") || "";
    const storedName = localStorage.getItem("userName") || "ไม่ระบุชื่อพนักงาน";
    const storedTag = localStorage.getItem("companyTag") || "AUDITOR";

    setUserCode(storedUsername);
    setDisplayName(storedName);
    setCompanyTag(storedTag.toUpperCase());

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("th-TH", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " น.",
      );
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const getSupabaseStores = async () => {
      try {
        setIsLoadingStores(true);
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .order("store_name", { ascending: true });
        if (error) throw error;
        if (data) setStores(data as StoreData[]);
      } catch (err: any) {
        console.error("Error fetching stores:", err.message);
      } finally {
        // 🟢 แก้ไขจุดพิมพ์ไวยากรณ์หลุด chunks: finally เรียบร้อยครับพี่นิวาส
        setIsLoadingStores(false);
      }
    };
    getSupabaseStores();
  }, []);

  useEffect(() => {
    const fetchTodayLogs = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("username", userCode)
        .gte("created_at", `${today}T00:00:00`);

      if (data) setTodayHistory(data);
    };
    if (userCode) fetchTodayLogs();
  }, [userCode]);

  const baseStores = stores.filter((store) => {
    if (!userCode) return false;
    if (companyTag.includes("ADMIN")) return true;

    const cleanUserCode = userCode.trim().toUpperCase();
    const firstLetter = cleanUserCode.charAt(0);

    if (firstLetter === "M") {
      return store.mer_code?.toUpperCase() === cleanUserCode;
    } else if (firstLetter === "C") {
      const managerArea = "K" + cleanUserCode.substring(1, 3);
      return store.area?.toUpperCase() === managerArea;
    } else if (["K", "B"].includes(firstLetter)) {
      return store.area?.toUpperCase() === cleanUserCode;
    }

    return store.mer_code?.toUpperCase() === cleanUserCode;
  });

  const uniqueChanels = Array.from(
    new Set(baseStores.map((s) => s.chanel).filter(Boolean)),
  );

  const uniqueAccounts = Array.from(
    new Set(
      baseStores
        .filter((s) => !selectedChanel || s.chanel === selectedChanel)
        .map((s) => s.account)
        .filter(Boolean),
    ),
  );

  const displayedStores = baseStores.filter(
    (store) =>
      (!selectedChanel || store.chanel === selectedChanel) &&
      (!selectedAccount || store.account === selectedAccount),
  );

  const handleSubmitCallVisit = async () => {
    if (!selectedStore)
      return Swal.fire({ icon: "warning", title: "กรุณาเลือกร้านค้า" });
    if (!isCheckIn && !isCheckOut)
      return Swal.fire({ icon: "warning", title: "ระบุสถานะงาน" });
    if (!isGpsReady)
      return Swal.fire({
        icon: "error",
        title: "ยังไม่ได้พิกัด GPS",
        text: "โปรดรอให้ระบบจับตำแหน่งสำเร็จ หรือตรวจสอบการเปิด GPS บนอุปกรณ์มือถือ",
      });
    if (!imageFile)
      return Swal.fire({
        icon: "warning",
        title: "กรุณาถ่ายรูป",
        text: "ต้องแนบรูปถ่ายการปฏิบัติงานครับ",
      });

    try {
      setIsSubmitting(true);

      // 🟢 ขั้นตอนใหม่: ตรวจสอบว่าวันนี้ Check-in/out ที่ร้านนี้ไปหรือยัง?
      const today = new Date().toISOString().split("T")[0];
      const { data: existingLogs } = await supabase
        .from("attendance_logs")
        .select("id, type")
        .eq("username", userCode)
        .eq("store_id", parseInt(selectedStore))
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      let note = "";

      // ถ้ามีข้อมูลของวันนี้แล้ว
      if (existingLogs && existingLogs.length > 0) {
        const { value: reason, isConfirmed } = await Swal.fire({
          title: "ตรวจพบการบันทึกซ้ำ",
          text: "วันนี้ท่านได้บันทึกข้อมูลที่สาขานี้ไปแล้ว หากต้องการบันทึกอีกครั้งโปรดระบุเหตุผล (เช่น เช็คสต็อกรอบดึก)",
          input: "text",
          inputLabel: "ระบุเหตุผล",
          inputPlaceholder: "กรอกเหตุผลที่นี่...",
          showCancelButton: true,
          confirmButtonText: "ยืนยัน",
          cancelButtonText: "ยกเลิก",
          inputValidator: (value) => {
            if (!value) return "กรุณาระบุเหตุผลครับ";
          },
        });

        if (!isConfirmed) {
          setIsSubmitting(false);
          return; // ยกเลิกการบันทึก
        }
        note = reason;
      }

      // 🟢 ขั้นตอนการบันทึกปกติ (รวมเหตุผลเข้าไปด้วย)
      const publicUrl = await uploadImageToStorage(imageFile);
      if (!publicUrl) throw new Error("ไม่สามารถอัปโหลดรูปภาพได้");

      const currentStore = stores.find((s) => s.id === parseInt(selectedStore));
      if (!currentStore) throw new Error("ไม่พบข้อมูลร้านค้า");
      const {
        id,
        store_name,
        store_code,
        area,
        chanel,
        account,
        province,
        region,
        store_img,
        store_type,
        address,
        phone,
        lat,
        lng,
      } = currentStore;

      const { error } = await supabase.from("attendance_logs").insert([
        {
          username: userCode,
          display_name: displayName,
          company_tag: companyTag,
          type: isCheckIn ? "check-in" : "check-out",
          latitude: deviceLat,
          longitude: deviceLng,
          image_url: publicUrl,
          created_at: new Date().toISOString(),
          note: note,

          store_id: id,
          store_name: store_name,
          store_code: store_code,
          store_area: area,
          store_chanel: chanel,
          store_account: account,
          store_province: province,
          store_region: region,
          store_img: store_img,
          store_type: store_type,
          store_address: address,
          store_phone: phone,
          store_lat: lat,
          store_lng: lng,
        },
      ]);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลสำเร็จ",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        setSelectedStore("");
        setIsCheckIn(false);
        setIsCheckOut(false);
        setImagePreview(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. ดักจับไฟล์ที่ผิดปกติ (เช่น เลือกจาก Google Cloud ที่ยังไม่โหลดลงเครื่อง)
    if (file.size === 0) {
      alert("รูปภาพนี้ไม่สามารถใช้งานได้ กรุณาเลือกรูปภาพที่อยู่ในเครื่องครับ");
      return;
    }

    try {
      // 2. ตั้งค่าการบีบอัดไฟล์ (สำคัญมาก ป้องกัน Vercel Error และ Database บวม)
      const options = {
        maxSizeMB: 0.5, // บีบให้เหลือไม่เกิน 500 KB
        maxWidthOrHeight: 1280, // ย่อขนาดภาพไม่ให้กว้าง/ยาวเกิน 1280px (พอใช้งานบนเว็บแล้ว)
        useWebWorker: true,
      };

      // โชว์สถานะกำลังโหลด (ถ้ามี state loading)
      // setIsLoading(true);

      // 3. เริ่มการบีบอัด
      const compressedFile = await imageCompression(file, options);

      // 4. สร้าง Preview ให้ User ดูบนหน้าจอ (แปลงเป็น Object URL ชั่วคราว)
      const previewUrl = URL.createObjectURL(compressedFile);
      setImagePreview(previewUrl);

      // 5. นำ compressedFile ไปเก็บไว้ใน State เพื่อรอจังหวะที่กดปุ่ม "บันทึกข้อมูล"
      // แล้วค่อยอัปโหลดไฟล์ก้อนนี้ขึ้น Supabase Storage -> เอา URL มาบันทึกลง Database
      setImageFile(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
      alert("เกิดข้อผิดพลาดในการจัดการรูปภาพครับ");
    } finally {
      // setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#bbf5eb] font-sans pb-12 relative">
      <header className="bg-gradient-to-r from-[#1e3a8a] via-[#0f172a] to-[#1e293b] text-white shadow-lg border-b border-blue-900/40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="bg-white p-1.5 rounded-xl shadow-md">
              <img src="/favicon.ico" className="h-10 w-auto" alt="logo" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Check-in Portal</h1>
              <p className="text-xs text-slate-300">{currentTime}</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
          >
            <Home className="w-3.5 h-3.5" /> กลับหน้าหลัก
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 space-y-4 py-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              ผู้รายงานตัว ({userCode || "กำลังโหลด..."})
            </p>
            <h3 className="text-base font-bold text-slate-800">
              {displayName}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={selectedChanel}
              onChange={(e) => {
                setSelectedChanel(e.target.value);
                setSelectedAccount("");
                setSelectedStore("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-blue-500 transition-all"
            >
              <option value="">-- Chanel --</option>
              {uniqueChanels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setSelectedStore("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-blue-500 transition-all"
            >
              <option value="">-- Account --</option>
              {uniqueAccounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {isLoadingStores ? (
            <div className="text-center py-3 text-xs text-slate-500 flex items-center justify-center gap-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />{" "}
              กำลังประมวลผลข้อมูลสาขา...
            </div>
          ) : (
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-blue-500 transition-all"
            >
              <option value="">
                เลือกร้านค้าที่ได้รับมอบหมาย ({displayedStores.length})
              </option>
              {displayedStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.store_name} [{s.store_code}]
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setIsCheckIn(true);
              setIsCheckOut(false);
            }}
            className={`p-4 rounded-2xl border transition-all ${isCheckIn ? "bg-blue-50 border-blue-300 text-blue-600 shadow-sm" : "bg-white hover:border-blue-200"}`}
          >
            <LogIn className="w-6 h-6 mx-auto" />
            <span className="text-xs font-bold block mt-1">Check-in</span>
          </button>
          <button
            onClick={() => {
              setIsCheckOut(true);
              setIsCheckIn(false);
            }}
            className={`p-4 rounded-2xl border transition-all ${isCheckOut ? "bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm" : "bg-white hover:border-emerald-200"}`}
          >
            <LogOut className="w-6 h-6 mx-auto" />
            <span className="text-xs font-bold block mt-1">Check-out</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          {/* 🟢 แก้ไขแล้วครับ: เอาคำสั่ง capture="environment" ออกตามบรีฟ เพื่อเปิดให้มีตัวเลือกว่าจะถ่ายรูปสดหรือเปิดคลังอัพโหลดรูปภาพจากระบบได้ และช่วยแก้บั๊ก iOS จอดำสนิทสำเร็จครับ */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageCapture}
            className="hidden"
          />
          <div
            onClick={triggerCamera}
            className="border-2 border-dashed h-40 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 rounded-xl hover:border-blue-400 overflow-hidden transition-all"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                className="h-full w-full object-contain"
                alt="preview"
              />
            ) : (
              <>
                <Camera className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 mt-2">
                  กดถ่ายรูปภาพ หรือ เลือกรูปจากคลังภาพหน้างาน
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            สถานะตรวจสอบพิกัด (GPS)
          </label>
          <div
            className={`rounded-xl p-3 flex items-start space-x-2.5 border transition-all ${isGpsReady ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
          >
            <div
              className={`p-1 rounded-lg text-white mt-0.5 ${isGpsReady ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
            >
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <p
                className={`text-xs font-bold ${isGpsReady ? "text-emerald-700" : "text-amber-700"}`}
              >
                {gpsStatus}
              </p>
              {isGpsReady && deviceLat && deviceLng && (
                <p className="text-[10px] text-emerald-600 font-mono mt-0.5">
                  Lat: {deviceLat?.toFixed(5)}, Lng: {deviceLng?.toFixed(5)}
                </p>
              )}
            </div>
          </div>
          {!isGpsReady && (
            <button
              onClick={fetchCurrentLocation}
              className="w-full text-[10px] bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg font-bold text-slate-600 transition-all"
            >
              🔄 เรียกซ้ำตำแหน่งพิกัดดาวเทียม
            </button>
          )}
        </div>

        <button
          onClick={handleSubmitCallVisit}
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-4 rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 animate-spin" />}
          {isSubmitting
            ? "กำลังอัปโหลดและบันทึกข้อมูล..."
            : "บันทึกข้อมูลการเข้าปฏิบัติงาน (Call Visit)"}
        </button>
      </main>

      <footer className="py-5 text-center text-[10px] text-slate-400 font-bold">
        &copy; 2026 RIVERPRO INTERTRADE CO., LTD.
      </footer>
    </div>
  );
}
