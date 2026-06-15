/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  MapPin,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Navigation,
  Store,
  Camera,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Swal from "sweetalert2";

// 🟢 1. สร้างระบบฐานข้อมูลสำรองในมือถือ (IndexedDB Helper)
const openOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FMBD_Offline_DB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("attendance_logs")) {
        db.createObjectStore("attendance_logs", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveLogToDevice = async (logData: any) => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("attendance_logs", "readwrite");
    const store = transaction.objectStore("attendance_logs");
    const request = store.add(logData);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export default function CheckInPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ข้อมูลพนักงาน
  const [loginName, setLoginName] = useState("");
  const [loginCode, setLoginCode] = useState("");

  // พิกัด GPS และรูปภาพ
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ข้อมูลร้านค้า
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedCode = localStorage.getItem("userCode");
    if (storedName) {
      setLoginName(storedName);
      setLoginCode(storedCode || "—");
    } else {
      router.push("/login");
    }

    fetchStores();
    getLocation();
  }, [router]);

  // ดึงรายชื่อสาขา
  const fetchStores = async () => {
    try {
      setLoadingStores(true);
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("store_name", { ascending: true });
      if (error) throw error;
      setStores(data || []);
    } catch (err) {
      console.error("ดึงข้อมูลร้านค้าจากฐานข้อมูลหลักไม่ได้");
      // ในกรณีฉุกเฉินดึงจาก LocalStorage ที่เคยมีเก็บไว้ (ถ้ามี)
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  // ดึงพิกัด GPS
  const getLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGettingLocation(false);
      },
      () => setGettingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // 📸 ฟังก์ชันเปิดกล้องและบีบอัดรูปภาพทันทีเพื่อประหยัดพื้นที่เครื่องน้อง
  const handleCaptureImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600; // บีบความกว้างเหลือ 600px พอสำหรับดูหลักฐาน
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // แปลงเป็น Base64 แบบบีบอัดคุณภาพเหลือ 40% (ไฟล์จะเบามากเครื่องไม่เอ๋อ)
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.4);
        setImagePreview(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  // บันทึกข้อมูลลงเครื่องมือถือ (ไม่ส่งขึ้น Supabase)
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId || !latitude || !longitude || !imagePreview) {
      Swal.fire(
        "ข้อมูลไม่ครบ",
        "โปรดเลือกร้านค้า ถ่ายรูป และดึงพิกัดให้ครบถ้วนครับพี่",
        "warning",
      );
      return;
    }

    const storeInfo = stores.find((s) => s.id.toString() === selectedStoreId);

    const logData = {
      username: loginCode,
      display_name: loginName,
      latitude: latitude,
      longitude: longitude,
      image_url: imagePreview, // 💾 เก็บรูป Base64 ไว้ในฐานข้อมูลเครื่องมือถือ
      company_tag: "RVP",
      type: "check_in",
      created_at: new Date().toISOString(),
      store_id: storeInfo?.id,
      store_name: storeInfo?.store_name || "ระบุสาขาด้วยมือ",
      store_code: storeInfo?.store_code,
      store_province: storeInfo?.store_province,
    };

    setSubmitting(true);
    try {
      // 🚀 สั่งเซฟลงเครื่องพนักงานทันที ข้าม Supabase ไปเลยชั่วคราว
      await saveLogToDevice(logData);

      await Swal.fire({
        title: "เช็คอินสำเร็จ! (บันทึกในเครื่อง)",
        text: `ระบบได้บันทึกข้อมูลและรูปถ่ายสาขา ${logData.store_name} ไว้ในความจำเครื่องเรียบร้อยแล้วครับ เดินทางต่อได้เลย!`,
        icon: "success",
        confirmButtonText: "รับทราบ",
      });

      setImagePreview(null);
      router.push("/");
    } catch (err: any) {
      console.error(err);
      Swal.fire("เกิดข้อผิดพลาดในการบันทึก", "กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16 max-w-md mx-auto shadow-2xl border-x border-slate-200">
      {/* แจ้งเตือนสถานะออฟไลน์ */}
      <div className="bg-amber-500 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-inner">
        <AlertTriangle className="w-4 h-4 animate-pulse" />{" "}
        โหมดบันทึกข้อมูลลงเครื่องมือถือชั่วคราว (ระบบตารางหลักปิดปรับปรุง)
      </div>

      {/* HEADER */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-50 flex items-center justify-between shadow-md">
        <button onClick={() => router.push("/")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-wider">
          ระบบเช็คอินปฏิบัติงานกองบิน
        </h1>
        <div className="w-5"></div>
      </div>

      <main className="p-4 space-y-5">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-1.5 text-xs text-blue-200 font-bold mb-1">
            <ShieldCheck className="w-4 h-4" />
            โหมดบันทึกปลอดภัยระดับเครื่องพนักงาน
          </div>
          <h2 className="text-base font-black">{loginName}</h2>
          <p className="text-xs text-blue-100 font-mono">
            รหัสพนักงาน: {loginCode}
          </p>
        </div>

        <form onSubmit={handleCheckInSubmit} className="space-y-5">
          {/* เลือกสถานที่ */}
          <div className="bg-white border rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5 border-b pb-2">
              <Store className="w-4 h-4 text-blue-600" />{" "}
              กรุณาเลือกสถานที่ปฏิบัติงาน
            </h3>
            {loadingStores ? (
              <input
                type="text"
                placeholder="พิมพ์ระบุชื่อร้านค้า/สาขาที่นี่..."
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold"
                required
              />
            ) : (
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold focus:outline-hidden"
                required
              >
                <option value="">-- เลือกสาขา / ร้านค้า --</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id.toString()}>
                    [{store.store_code || "N/A"}] {store.store_name} -{" "}
                    {store.store_province || ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* โหมดกล้องถ่ายภาพ (เปิดให้ใช้งานได้แล้ว!) */}
          <div className="bg-white border rounded-2xl p-4 shadow-xs space-y-3 text-center">
            <h3 className="text-xs font-black uppercase text-slate-500 text-left flex items-center gap-1.5 border-b pb-2">
              <Camera className="w-4 h-4 text-violet-600" />{" "}
              ถ่ายรูปหน้างานหลักฐาน
            </h3>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleCaptureImage}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-w-xs mx-auto">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1.5 text-[10px] font-bold rounded-lg backdrop-blur-xs"
                >
                  ถ่ายใหม่
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex flex-col items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-bold">
                  กดตรงนี้เพื่อเปิดกล้องถ่ายรูปหน้างาน
                </span>
              </button>
            )}
          </div>

          {/* พิกัด GPS */}
          <div className="bg-white border rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-500" /> พิกัดตำแหน่ง GPS
                ปัจจุบัน
              </h3>
              <button
                type="button"
                onClick={getLocation}
                className="p-1.5 text-blue-600 bg-blue-50 rounded-lg"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${gettingLocation ? "animate-spin" : ""}`}
                />
              </button>
            </div>
            {latitude && longitude ? (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border text-center font-mono text-[11px] font-bold">
                <div>
                  <span className="text-[9px] text-slate-400 block">
                    LATITUDE
                  </span>
                  <span className="text-emerald-600">
                    {latitude.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">
                    LONGITUDE
                  </span>
                  <span className="text-emerald-600">
                    {longitude.toFixed(6)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-3 bg-amber-50 rounded-xl text-xs font-bold text-amber-700 animate-pulse">
                📍 กำลังจับพิกัดความละเอียดสูง...
              </div>
            )}
          </div>

          {/* ปุ่มกดยืนยัน */}
          <button
            type="submit"
            disabled={submitting || !latitude || !longitude || !imagePreview}
            className="w-full py-4 rounded-xl text-white font-black text-sm bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 shadow-lg flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {submitting
              ? "กำลังบันทึกลงหน่วยความจำ..."
              : "ยืนยันเช็คอิน (เซฟลงเครื่องมือถือ)"}
          </button>
        </form>
      </main>
    </div>
  );
}
