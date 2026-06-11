"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase";
import {
  MapPin,
  Camera,
  User,
  Store,
  CheckCircle2,
  Home,
  Trash2,
  Loader2,
  Filter,
  RotateCw,
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
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 💡 สถานะสำหรับระบบตัวกรอง Chanel และ Account
  const [selectedChanel, setSelectedChanel] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(""); // 👈 แก้ไขบรรทัดนี้ให้สมบูรณ์ครับพี่

  // พิกัด GPS เครื่องพนักงาน
  const [deviceLat, setDeviceLat] = useState<number | null>(null);
  const [deviceLng, setDeviceLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState("กำลังค้นหาสัญญาณดาวเทียม...");
  const [isGpsReady, setIsGpsReady] = useState(false);

  // ข้อมูลผู้ใช้งานที่ล็อกอินเข้ามาจริง
  const [userCode, setUserCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyTag, setCompanyTag] = useState("");

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("เบราว์เซอร์ของท่านไม่รองรับการดึง GPS");
      return;
    }
    setIsGpsReady(false);
    setGpsStatus("กำลังจับพิกัดความละเอียดสูง...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLat(position.coords.latitude);
        setDeviceLng(position.coords.longitude);
        setGpsStatus("ยืนยันพิกัดตัวเครื่องสำเร็จ");
        setIsGpsReady(true);
      },
      (error) => {
        console.error("GPS Error:", error);
        setIsGpsReady(false);
        setGpsStatus("❌ กรุณาเปิดสิทธิ์ GPS บนอุปกรณ์ของท่าน");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    const link: HTMLLinkElement =
      document.querySelector("link[rel*='icon']") ||
      document.createElement("link");
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    link.href = "/assets/rvp.png";
    document.getElementsByTagName("head")[0].appendChild(link);

    fetchCurrentLocation();

    const storedUsername =
      localStorage.getItem("userCode") ||
      localStorage.getItem("username") ||
      "M00000";
    const storedName =
      localStorage.getItem("userName") ||
      localStorage.getItem("employeeName") ||
      "ไม่ระบุชื่อพนักงาน";
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

  // ดึงข้อมูลร้านค้าทั้งหมดจากตาราง stores
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
        setIsLoadingStores(false);
      }
    };
    getSupabaseStores();
  }, []);

  // 🎯 ปรับลอจิกคัดกรองด่านแรกขั้นเทพ ถอดรหัสหาเขตตามโครงสร้างองค์กรจริง
  const getBaseFilteredStores = () => {
    const cleanUserCode = userCode.trim().toUpperCase();
    const cleanTag = companyTag.trim().toUpperCase();

    // ด่านที่ 0: สิทธิ์ระดับ ADMIN ให้ทะลุเห็นทุกร้านค้า 100%
    if (cleanTag.includes("ADMIN") || cleanUserCode.includes("ADMIN")) {
      return stores;
    }

    // ด่านที่ 1: กลุ่มรหัส K01 - K08 (KOE) -> จับคู่กรองตามคอลัมน์ store.area โดยตรง
    const matchKoeArea =
      cleanUserCode.match(/K0[1-8]/) || cleanTag.match(/K0[1-8]/);
    if (matchKoeArea) {
      return stores.filter(
        (store) => store.area?.toUpperCase() === matchKoeArea[0],
      );
    }

    // ด่านที่ 2: กลุ่มรหัส C (COMMANDO) -> สกัดหาเขตจากรหัสพนักงาน (เช่น C07001 -> K07)
    if (cleanUserCode.startsWith("C") && cleanUserCode.length >= 3) {
      const areaNumber = cleanUserCode.substring(1, 3);
      const targetArea = `K${areaNumber}`;

      // ดึงร้านค้าทั้งหมดที่อยู่ในเขตพื้นที่รับผิดชอบของ KOE คนนั้นให้ COMMANDO เข้าทำงานแทนได้ทั้งหมด
      return stores.filter((store) => store.area?.toUpperCase() === targetArea);
    }

    // ด่านที่ 3: กลุ่มรหัส M (MER) -> วิ่งเฉพาะร้านที่มีรหัสกำกับตรงตัวในคอลัมน์ mer_code เท่านั้น
    if (cleanUserCode.startsWith("M")) {
      return stores.filter(
        (store) => store.mer_code?.toUpperCase() === cleanUserCode,
      );
    }

    // ด่านสุดท้ายกรณีหลุดโผ (Fallback)
    return stores.filter(
      (store) =>
        store.mer_code?.toUpperCase() === cleanUserCode ||
        store.area?.toUpperCase() === cleanUserCode,
    );
  };

  const baseStores = getBaseFilteredStores();

  // 💡 สเต็ปที่ 2: ดึงรายชื่อตัวเลือก Chanel และ Account ที่ไม่ซ้ำกันมาโชว์ในดรอบดาวน์
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

  // 💡 สเต็ปที่ 3: กรองขั้นสุดท้ายแบบไดนามิกเพื่อนำไปแสดงผลที่แถบเลือกร้านค้าหลัก
  const getDisplayedStores = () => {
    return baseStores.filter((store) => {
      const matchChanel = !selectedChanel || store.chanel === selectedChanel;
      const matchAccount =
        !selectedAccount || store.account === selectedAccount;
      return matchChanel && matchAccount;
    });
  };

  const displayedStores = getDisplayedStores();

  const handleSubmitCallVisit = async () => {
    if (!selectedStore) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกร้านค้า",
        text: "โปรดเลือกโมเดิร์นเทรดหน้าร้านก่อนทำการบันทึกครับ",
        confirmButtonColor: "#1e3a8a",
      });
      return;
    }
    if (!isCheckIn && !isCheckOut) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุสถานะเข้างาน",
        text: "โปรดเลือก Check-in เข้างาน หรือ Check-out ออกงาน อย่างใดอย่างหนึ่งครับ",
        confirmButtonColor: "#1e3a8a",
      });
      return;
    }
    if (!isGpsReady || deviceLat === null || deviceLng === null) {
      Swal.fire({
        icon: "error",
        title: "ระบบยังไม่มีพิกัด GPS",
        text: "โปรดรอให้ระบบจับตำแหน่งตัวเครื่องจริงสำเร็จก่อนบันทึกครับ",
        confirmButtonColor: "#1e3a8a",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const currentStore = stores.find((s) => s.id === parseInt(selectedStore));
      if (!currentStore)
        throw new Error("ไม่พบข้อมูลโครงสร้างร้านค้าที่เลือกในระบบ");

      const { error } = await supabase.from("attendance_logs").insert([
        {
          username: userCode,
          display_name: displayName,
          company_tag: companyTag,
          type: isCheckIn ? "check-in" : "check-out",
          latitude: deviceLat,
          longitude: deviceLng,
          image_url: imagePreview,
          store_id: currentStore.id,
          store_area: currentStore.area,
          store_chanel: currentStore.chanel,
          store_account: currentStore.account,
          store_province: currentStore.province,
          store_region: currentStore.region,
          store_code: currentStore.store_code,
          store_img: currentStore.store_img,
          store_type: currentStore.store_type,
          store_address: currentStore.address,
          store_phone: currentStore.phone,
          store_lat: currentStore.lat,
          store_lng: currentStore.lng,
          store_name: currentStore.store_name,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลสำเร็จ",
        text: "ระบบได้ทำการบันทึกประวัติการปฏิบัติงานเรียบร้อยแล้ว",
        confirmButtonColor: "#1e3a8a",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        setSelectedStore("");
        setSelectedChanel("");
        setSelectedAccount("");
        setIsCheckIn(false);
        setIsCheckOut(false);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchCurrentLocation();
      });
    } catch (err: any) {
      console.error("Error saving visit:", err.message);
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: `เกิดข้อผิดพลาด: ${err.message}`,
        confirmButtonColor: "#1e3a8a",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#bbf5eb] font-sans pb-12">
      <header className="bg-gradient-to-r from-[#1e3a8a] via-[#0f172a] to-[#1e293b] text-white shadow-lg border-b border-blue-900/40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="bg-white p-1.5 rounded-xl shadow-md flex items-center justify-center">
              <img
                src="/favicon.ico"
                alt="Icon Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <h1 className="text-lg font-bold tracking-wide">
                  Riverpro Intertrade Co., Ltd
                </h1>
                <span className="hidden sm:inline opacity-40">|</span>
                <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20 w-fit mx-auto sm:mx-0">
                  Market Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5 opacity-90 tracking-wide">
                {currentTime || "กำลังโหลดเวลาเซิร์ฟเวอร์..."}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchCurrentLocation}
              className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-white transition-all border border-white/10 flex items-center justify-center"
              title="ดึงพิกัดใหม่ด่วน"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-white text-xs font-bold transition-all border border-white/10 flex items-center space-x-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>กลับหน้าหลัก</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-100 py-3 mb-6 text-center">
        <h2 className="text-sm font-bold text-slate-700 tracking-wide flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-blue-600" /> บันทึก Call Visit
          ปฏิบัติงานภาคสนาม
        </h2>
      </div>

      <main className="max-w-xl mx-auto px-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ผู้รายงานตัวปฏิบัติงาน ({userCode})
              </p>
              <h3 className="text-base font-bold text-slate-800">
                {displayName}
              </h3>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${companyTag.includes("ADMIN") ? "bg-red-50 text-red-600 border-red-100" : "bg-purple-50 text-purple-600 border-purple-100"}`}
          >
            {companyTag || "AUDITOR"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3 text-blue-500" /> ช่องทาง (Chanel)
              </label>
              <select
                value={selectedChanel}
                onChange={(e) => {
                  setSelectedChanel(e.target.value);
                  setSelectedAccount("");
                  setSelectedStore("");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition-all"
              >
                <option value="">-- ทั้งหมด ({uniqueChanels.length}) --</option>
                {uniqueChanels.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3 text-blue-500" /> บัญชีร้านค้า
                (Account)
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value);
                  setSelectedStore("");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition-all"
              >
                <option value="">
                  -- ทั้งหมด ({uniqueAccounts.length}) --
                </option>
                {uniqueAccounts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <Store className="w-4 h-4 text-blue-600" />
              <span>เลือกร้านค้าปฏิบัติงาน (Call Visit)</span>
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              disabled={isLoadingStores}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-60"
            >
              {isLoadingStores ? (
                <option>กำลังประมวลผลข้อมูลตามสิทธิ์พนักงาน...</option>
              ) : displayedStores.length === 0 ? (
                <option value="">
                  ⚠️ ไม่พบรายชื่อร้านค้าตามตัวกรองที่ระบุ
                </option>
              ) : (
                <>
                  <option value="">
                    -- โปรดเลือกร้านค้า ({displayedStores.length} ร้านค้าย่อย)
                    --
                  </option>
                  {displayedStores.map((store: StoreData) => (
                    <option key={store.id} value={store.id}>
                      {store.store_name} [{store.store_code}]
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCheckIn(true);
              setIsCheckOut(false);
            }}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm ${isCheckIn ? "bg-blue-50 border-blue-300 text-blue-600 ring-2 ring-blue-100" : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"}`}
          >
            <LogIn className="w-6 h-6" />
            <span className="text-xs font-bold">Check-in เข้างาน</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCheckOut(true);
              setIsCheckIn(false);
            }}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm ${isCheckOut ? "bg-emerald-50 border-emerald-300 text-emerald-600 ring-2 ring-emerald-100" : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"}`}
          >
            <LogOut className="w-6 h-6" />
            <span className="text-xs font-bold">Check-out ออกงาน</span>
          </button>
        </div>

        {/* 📸 บล็อกรูปภาพที่มีการปลดล็อก capture="environment" เรียบร้อยแล้ว */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            รูปถ่ายยืนยันตัวตนและการเยี่ยมชม
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageCapture} // 🎯 เอา capture="environment" ออกเพื่อให้ดึงเมนูระบบขึ้นมาเลือกได้
            className="hidden"
          />
          <div
            onClick={triggerCamera}
            className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 rounded-xl p-4 transition-all flex flex-col items-center justify-center min-h-[160px] cursor-pointer group relative overflow-hidden"
          >
            {imagePreview ? (
              <div className="w-full h-full min-h-[140px] relative flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Captured storefront"
                  className="max-h-[180px] rounded-lg object-contain shadow-sm"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-all mb-2">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-600">
                  กดเพื่อถ่ายภาพใหม่ หรือเลือกรูปจากอัลบั้ม
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  ระบบรองรับทั้งการถ่ายสดและอัปโหลดรูปภาพหน้าร้านครับพี่
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            พิกัดสถานะความปลอดภัย (GPS ดาวเทียมสด)
          </label>
          <div
            className={`rounded-xl p-3 flex items-start space-x-2.5 border ${isGpsReady ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
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
              {isGpsReady && (
                <p className="text-[11px] font-medium text-emerald-600 tracking-wide mt-0.5">
                  Lat: {deviceLat?.toFixed(6)}, Lng: {deviceLng?.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmitCallVisit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-md active:scale-[0.99] transition-all text-sm tracking-wide mt-2 flex items-center justify-center space-x-2 disabled:opacity-75"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังบันทึกข้อมูล...</span>
            </>
          ) : (
            <span>บันทึก Call Visit ปฏิบัติงาน</span>
          )}
        </button>
      </main>

      <footer className="bg-gradient-to-r from-[#f9fafc] via-[#d0daf3] to-[#cedef7] border-slate-100 py-5 text-center text-xs font-medium text-slate-400 tracking-wider">
        &copy; 2026 RIVERPRO INTERTRADE CO., LTD. All rights reserved.
      </footer>
    </div>
  );
}
