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
  ClipboardList,
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

  const [attendanceType, setAttendanceType] = useState("วันทำงานปกติ");
  const [leaveType, setLeaveType] = useState("");
  const [extraReason, setExtraReason] = useState("");

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

        if (isLine) {
          setGpsStatus("⚠️ สัญญาณผ่าน LINE (แนะนำเปิดใน Chrome/Safari)");
          setIsGpsReady(true);
        } else if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus("❌ ถูกปฏิเสธสิทธิ์เข้าถึงตำแหน่ง (โปรดเปิดสิทธิ์)");
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

  // 🟢 เช็คว่าประเภทการลงเวลา "ต้องเลือกร้านค้า" หรือไม่
  const isStoreRequired = [
    "วันทำงานปกติ",
    "วันทำงานนักขัตฤกษ์",
    "เข้ากลางคืน",
  ].includes(attendanceType);

  const needsReason =
    attendanceType === "เข้ากลางคืน" ||
    attendanceType === "วันหยุดชดเชยนักขัตฤกษ์" ||
    attendanceType === "สลับวันหยุด" ||
    (attendanceType === "วันลา" &&
      (leaveType === "ลากิจ" || leaveType === "ลากิจครึ่งวัน"));

  const getPlaceholderText = () => {
    if (attendanceType === "เข้ากลางคืน")
      return "ระบุเหตุผล เช่น นับสต๊อก, จัดแพลนโนแกรม";
    if (attendanceType === "วันหยุดชดเชยนักขัตฤกษ์")
      return "ระบุวันนักขัตฤกษ์ที่ขอชดเชย";
    if (attendanceType === "สลับวันหยุด")
      return "ระบุวันที่ต้องการขอสลับวันหยุด";
    if (attendanceType === "วันลา") return "ระบุเหตุผลการลากิจ";
    return "ระบุรายละเอียดเพิ่มเติม";
  };

  const handleSubmitCallVisit = async () => {
    // 🟢 Validation วันลา/เหตุผล
    if (attendanceType === "วันลา" && !leaveType) {
      return Swal.fire({
        icon: "warning",
        title: "กรุณาระบุประเภทการลา",
        text: "โปรดเลือกเหตุผลการลาในช่องด้านล่างครับ",
      });
    }
    if (needsReason && !extraReason.trim()) {
      return Swal.fire({
        icon: "warning",
        title: "กรุณาระบุข้อมูลเพิ่มเติม",
        text: getPlaceholderText(),
      });
    }

    // 🟢 Validation ร้านค้า (เฉพาะวันทำงาน)
    if (isStoreRequired && !selectedStore)
      return Swal.fire({ icon: "warning", title: "กรุณาเลือกร้านค้า" });

    if (!isCheckIn && !isCheckOut)
      return Swal.fire({
        icon: "warning",
        title: "ระบุสถานะงาน (Check-in/Out)",
      });
    if (!isGpsReady)
      return Swal.fire({
        icon: "error",
        title: "ยังไม่ได้พิกัด GPS",
        text: "โปรดรอให้ระบบจับตำแหน่งสำเร็จ",
      });
    if (!imageFile)
      return Swal.fire({
        icon: "warning",
        title: "กรุณาถ่ายรูป",
        text: "ต้องแนบรูปถ่าย หรือเอกสารหลักฐานครับ",
      });

    try {
      setIsSubmitting(true);

      const today = new Date().toISOString().split("T")[0];
      let duplicateQuery = supabase
        .from("attendance_logs")
        .select("id, type, attendance_type")
        .eq("username", userCode)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      // 🟢 Logic เช็คข้อมูลซ้ำ: ถ้าเป็นวันทำงานให้เช็คระดับสาขา ถ้าเป็นวันลาให้เช็คระดับวัน
      let finalAttendanceType =
        attendanceType === "วันลา" ? `วันลา - ${leaveType}` : attendanceType;

      if (isStoreRequired) {
        duplicateQuery = duplicateQuery.eq("store_id", parseInt(selectedStore));
      } else {
        duplicateQuery = duplicateQuery
          .is("store_id", null)
          .eq("attendance_type", finalAttendanceType);
      }

      const { data: existingLogs } = await duplicateQuery;

      let duplicateNote = "";

      if (existingLogs && existingLogs.length > 0) {
        const { value: reason, isConfirmed } = await Swal.fire({
          title: "ตรวจพบการบันทึกซ้ำ",
          text: isStoreRequired
            ? "วันนี้ท่านได้บันทึกข้อมูลที่สาขานี้ไปแล้ว หากต้องการบันทึกอีกครั้งโปรดระบุเหตุผล"
            : "วันนี้ท่านได้บันทึกการลานี้ไปแล้ว หากต้องการบันทึกซ้ำโปรดระบุเหตุผล",
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
          return;
        }
        duplicateNote = reason;
      }

      let finalNote = extraReason;
      if (duplicateNote) {
        finalNote = finalNote
          ? `${finalNote} | (บันทึกซ้ำ: ${duplicateNote})`
          : `(บันทึกซ้ำ: ${duplicateNote})`;
      }

      const publicUrl = await uploadImageToStorage(imageFile);
      if (!publicUrl) throw new Error("ไม่สามารถอัปโหลดรูปภาพได้");

      // 🟢 จัดเตรียมข้อมูลร้านค้าที่จะ Insert ลงฐานข้อมูล
      let storeDataToInsert = {};
      if (isStoreRequired) {
        const currentStore = stores.find(
          (s) => s.id === parseInt(selectedStore),
        );
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
        storeDataToInsert = {
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
        };
      } else {
        // หากเป็นวันลา ให้ใส่ข้อมูล Dummy ไม่ให้หน้า Report พัง
        storeDataToInsert = {
          store_id: null,
          store_name: finalAttendanceType,
          store_code: "OFF",
          store_area: "-",
          store_chanel: "-",
          store_account: "-",
          store_province: "-",
          store_region: "-",
          store_type: "-",
        };
      }

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
          attendance_type: finalAttendanceType,
          note: finalNote,
          ...storeDataToInsert, // 🟢 โยนชุดข้อมูลร้านค้า (หรือค่าว่าง) ลงไปพร้อมกัน
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
        setAttendanceType("วันทำงานปกติ");
        setLeaveType("");
        setExtraReason("");
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

    if (file.size === 0) {
      alert("รูปภาพนี้ไม่สามารถใช้งานได้ กรุณาเลือกรูปภาพที่อยู่ในเครื่องครับ");
      return;
    }

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const previewUrl = URL.createObjectURL(compressedFile);
      setImagePreview(previewUrl);
      setImageFile(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
      alert("เกิดข้อผิดพลาดในการจัดการรูปภาพครับ");
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

        {/* เลือกประเภทการทำงาน */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 border-l-4 border-indigo-500">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-indigo-500" />
            ประเภทการปฏิบัติงานวันนี้ (Attendance Type)
          </label>
          <select
            value={attendanceType}
            onChange={(e) => {
              setAttendanceType(e.target.value);
              setLeaveType("");
              setExtraReason("");
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 transition-all text-indigo-900"
          >
            <option value="วันทำงานปกติ">💼 วันทำงานปกติ</option>
            <option value="วันทำงานนักขัตฤกษ์">🌟 วันทำงานนักขัตฤกษ์</option>
            <option value="เข้ากลางคืน">🌙 เข้ากลางคืน (Night Shift)</option>
            <option value="วันหยุด">🏖️ วันหยุด</option>
            <option value="วันหยุดชดเชยนักขัตฤกษ์">
              🔄 วันหยุดชดเชยนักขัตฤกษ์
            </option>
            <option value="สลับวันหยุด">🔀 สลับวันหยุด</option>
            <option value="วันลา">📝 วันลา / ลากิจ / ลาป่วย</option>
          </select>

          {attendanceType === "วันลา" && (
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-500 transition-all text-orange-900"
            >
              <option value="">-- กรุณาระบุประเภทการลา --</option>
              <option value="ลาป่วยมีใบรับรองแพทย์">
                ลาป่วย มีใบรับรองแพทย์
              </option>
              <option value="ลาป่วยไม่มีใบรับรองแพทย์">
                ลาป่วย ไม่มีใบรับรองแพทย์
              </option>
              <option value="ลาป่วยครึ่งวัน">ลาป่วย ครึ่งวัน</option>
              <option value="ลากิจ">ลากิจ</option>
              <option value="ลากิจครึ่งวัน">ลากิจ ครึ่งวัน</option>
              <option value="ลาพักร้อน">
                ลาพักร้อน (ต้องได้รับการอนุมัติจาก KOE)
              </option>
            </select>
          )}

          {needsReason && (
            <input
              type="text"
              placeholder={getPlaceholderText()}
              value={extraReason}
              onChange={(e) => setExtraReason(e.target.value)}
              className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-rose-500 transition-all placeholder:text-rose-300 text-rose-700"
            />
          )}
        </div>

        {/* 🟢 ซ่อนกล่องเลือกร้านค้า ถ้าเป็นวันหยุดหรือวันลา */}
        {isStoreRequired && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 animate-fadeIn">
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
        )}

        {/* 🟢 ปรับเปลี่ยนปุ่มกด: ถ้าเป็นวันลา ให้มีแค่ปุ่มเดียวใหญ่ๆ */}
        <div
          className={`grid ${isStoreRequired ? "grid-cols-2" : "grid-cols-1"} gap-3`}
        >
          <button
            onClick={() => {
              setIsCheckIn(true);
              setIsCheckOut(false);
            }}
            className={`p-4 rounded-2xl border transition-all ${isCheckIn ? "bg-blue-50 border-blue-300 text-blue-600 shadow-sm" : "bg-white hover:border-blue-200"}`}
          >
            <LogIn className="w-6 h-6 mx-auto" />
            <span className="text-xs font-bold block mt-1">
              {isStoreRequired ? "Check-in" : "ส่งข้อมูลวันหยุด / วันลา"}
            </span>
          </button>

          {isStoreRequired && (
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
          )}
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
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
                {!isStoreRequired && (
                  <span className="text-[10px] text-orange-500 font-bold mt-1">
                    (หากเป็นวันลา กรุณาถ่ายใบรับรองแพทย์หรือหลักฐาน)
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* GPS Info */}
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
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmitCallVisit}
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-4 rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 animate-spin" />}
          {isSubmitting
            ? "กำลังอัปโหลดและบันทึกข้อมูล..."
            : "บันทึกข้อมูลเข้าสู่ระบบ"}
        </button>
      </main>
    </div>
  );
}
