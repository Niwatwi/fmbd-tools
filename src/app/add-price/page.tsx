/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase"; // 🟢 ใช้ท่อกลางหลักที่ต่อกับแพลน PRO และ .env.local เรียบร้อย
import {
  ArrowLeft,
  Barcode,
  Camera,
  ShoppingCart,
  Trash2,
  Save,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

export default function AddPricePage() {
  const router = useRouter();
  const [globalStores, setGlobalStores] = useState<any[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [storeNames, setStoreNames] = useState<string[]>([]);

  // Form States
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedStoreName, setSelectedStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [chanel, setChanel] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  // Product Detected State
  const [detectedProduct, setDetectedProduct] = useState<any>(null);
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [promoDetails, setPromoDetails] = useState("");
  const [offTake, setOffTake] = useState("");

  // Files State
  const [priceTagFile, setPriceTagFile] = useState<File | null>(null);
  const [shelfViewFile, setShelfViewFile] = useState<File | null>(null);
  const [priceTagPreview, setPriceTagPreview] = useState("");
  const [shelfViewPreview, setShelfViewPreview] = useState("");

  // Cart & UI State
  const [surveyCart, setSurveyCart] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // สเตทสำหรับเก็บข้อมูล User ที่ล็อกอินเข้ามาโชว์บนแบนเนอร์
  const [loginName, setLoginName] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const fileInputTag = useRef<HTMLInputElement>(null);
  const fileInputShelf = useRef<HTMLInputElement>(null);

  // ระบบนาฬิกา Real-time อัปเดตทุกวินาทีใต้ชื่อบริษัท
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

  // 1. โหลดข้อมูลร้านค้าเมื่อเข้าหน้าจอ + ดึง Session ผู้ใช้งาน
  useEffect(() => {
    async function loadStores() {
      try {
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .order("store_name", { ascending: true });
        if (error) throw error;
        setGlobalStores(data || []);
        const uniqueAreas = [
          ...new Set((data || []).map((s: any) => s.area).filter(Boolean)),
        ] as string[];
        setAreas(uniqueAreas);
      } catch (err: any) {
        Swal.fire("โหลดข้อมูลร้านค้าล้มเหลว", err.message, "error");
      }
    }
    loadStores();

    const storedName = localStorage.getItem("userName");
    const storedCode = localStorage.getItem("userCode");
    if (!storedName) {
      router.push("/login");
    } else {
      setLoginName(storedName);
      setLoginCode(storedCode || "—");
    }
  }, [router]);

  // 2. ระบบ Cascading Filter เลือกสาขา
  useEffect(() => {
    if (!selectedArea) {
      setAccounts([]);
      setStoreNames([]);
      return;
    }
    const filtered = [
      ...new Set(
        globalStores
          .filter((s) => s.area === selectedArea)
          .map((s) => s.account)
          .filter(Boolean),
      ),
    ] as string[];
    setAccounts(filtered);
    setSelectedAccount("");
    setSelectedStoreName("");
    setStoreCode("");
    setChanel("");
  }, [selectedArea, globalStores]);

  useEffect(() => {
    if (!selectedAccount) {
      setStoreNames([]);
      return;
    }
    const filtered = [
      ...new Set(
        globalStores
          .filter(
            (s) => s.area === selectedArea && s.account === selectedAccount,
          )
          .map((s) => s.store_name)
          .filter(Boolean),
      ),
    ] as string[];
    setStoreNames(filtered);
    setSelectedStoreName("");
    setStoreCode("");
    setChanel("");
  }, [selectedAccount, selectedArea, globalStores]);

  useEffect(() => {
    if (!selectedStoreName) {
      setStoreCode("");
      setChanel("");
      return;
    }
    const store = globalStores.find(
      (s) =>
        s.area === selectedArea &&
        s.account === selectedAccount &&
        s.store_name === selectedStoreName,
    );
    if (store) {
      setStoreCode(store.store_code || "");
      setChanel(store.chanel || "");
    }
  }, [selectedStoreName, selectedAccount, selectedArea, globalStores]);

  // 3. ระบบกล้องสแกนบาร์โค้ด
  const toggleScanner = async () => {
    if (isScanning) {
      if (qrReaderRef.current) {
        await qrReaderRef.current.stop();
        qrReaderRef.current = null;
      }
      setIsScanning(false);
    } else {
      setIsScanning(true);
      setTimeout(() => {
        const scanner = new Html5Qrcode("next-reader");
        qrReaderRef.current = scanner;
        scanner
          .start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 260, height: 140 } },
            (decodedText: string) => {
              setBarcodeInput(decodedText);
              handleSearchProduct(decodedText);
              scanner.stop().then(() => {
                setIsScanning(false);
                qrReaderRef.current = null;
              });
            },
            (err: any) => {
              console.warn("Scanner path tracking debug:", err);
            },
          )
          .catch((err: any) => {
            console.error(err);
            setIsScanning(false);
          });
      }, 300);
    }
  };

  // 4. ค้นหาสินค้าจากบาร์โค้ด
  const handleSearchProduct = async (targetBarcode = barcodeInput) => {
    if (!targetBarcode.trim()) {
      Swal.fire("แจ้งเตือน", "กรุณากรอกหรือสแกนบาร์โค้ดก่อนครับ", "warning");
      return;
    }
    uiLoadingStart();

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("barcode", targetBarcode.trim());
      Swal.close();
      if (error) throw error;

      if (data && data.length > 0) {
        setDetectedProduct(data[0]);
        Swal.fire({
          icon: "success",
          title: "ผูกข้อมูลสินค้าสำเร็จ",
          text: data[0].descriptions || data[0].product_name,
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        setDetectedProduct(null);
        Swal.fire("ไม่พบสินค้า", "ไม่พบสินค้านี้ในระบบข้อมูล Master", "error");
      }
    } catch (err: any) {
      Swal.fire("ระบบขัดข้อง", err.message, "error");
    }
  };

  const uiLoadingStart = () => {
    Swal.fire({
      title: "กำลังค้นหาสินค้า...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
  };

  // 5. เพิ่มรายการลงตะกร้า
  const handleAddToCart = () => {
    if (!detectedProduct) {
      Swal.fire(
        "คำเตือน",
        "กรุณาสแกนและค้นหาสินค้าให้สำเร็จก่อนครับ",
        "warning",
      );
      return;
    }
    if (!price) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาระบุราคาขายปกติก่อนครับ", "warning");
      return;
    }

    const cartItem = {
      barcode: barcodeInput,
      descriptions:
        detectedProduct.descriptions || detectedProduct.product_name || "",
      category: detectedProduct.category || "",
      category_code: detectedProduct.category_code || "",
      sub_category: detectedProduct.sub_category || "",
      segment: detectedProduct.segment || "",
      company: detectedProduct.company || "",
      company_type: detectedProduct.company_type || "",
      brand_type: detectedProduct.brand_type || "",
      brand: detectedProduct.brand || "",
      sub_brand: detectedProduct.sub_brand || "",
      pack_name: detectedProduct.pack_name || "",
      customer_id: detectedProduct.customer_id || null,
      imageurl: detectedProduct.imageurl || detectedProduct.image_url || null,
      price,
      promo_price: promoPrice || "0",
      promo_details: promoDetails,
      off_take: offTake || "0",
      priceTagFile,
      shelfViewFile,
      priceTagPreview,
      shelfViewPreview,
    };

    setSurveyCart([...surveyCart, cartItem]);

    setBarcodeInput("");
    setDetectedProduct(null);
    setPrice("");
    setPromoPrice("");
    setPromoDetails("");
    setOffTake("");
    setPriceTagFile(null);
    setShelfViewFile(null);
    setPriceTagPreview("");
    setShelfViewPreview("");
  };

  // 6. บันทึกทุกรายการและยิงไลน์แบบสับราง
  const handleSaveAllSurveys = async () => {
    if (surveyCart.length === 0) return;
    setIsSubmitting(true);

    Swal.fire({
      title: "กำลังบันทึกข้อมูล...",
      text: "ระบบกำลังดึงพิกัด GPS ความแม่นยำสูง อัปโหลดไฟล์ภาพ และนำส่งพิกัดฐานข้อมูล ห้ามปิดหน้านี้ครับ",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const currentStore = globalStores.find((s) => s.store_code === storeCode);
      const surveyorName = localStorage.getItem("userName") || "Unknown";
      const merCode = localStorage.getItem("userCode") || "Unknown";

      // 🛰️ ดึงพิกัดสดๆ จากดาวเทียมบนหน้าเครื่องพนักงานผ่านเบราว์เซอร์
      let currentLat: number | null = null;
      let currentLng: number | null = null;
      let gpsAccuracy: number | null = null;

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 0,
            });
          },
        );
        currentLat = position.coords.latitude;
        currentLng = position.coords.longitude;
        gpsAccuracy = position.coords.accuracy;
      } catch (gpsErr) {
        console.warn(
          "⚠️ สัญญาณ GPS ขัดข้อง หรือพนักงานไม่ได้เปิดสิทธิ์:",
          gpsErr,
        );
        currentLat = localStorage.getItem("hidden_lat")
          ? parseFloat(localStorage.getItem("hidden_lat")!)
          : null;
        currentLng = localStorage.getItem("hidden_lng")
          ? parseFloat(localStorage.getItem("hidden_lng")!)
          : null;
        gpsAccuracy = 999;
      }

      // 📏 คำนวณระยะห่างระหว่างพนักงานกับสาขา (เมตร)
      let distanceMeters = null;
      if (
        currentLat &&
        currentLng &&
        currentStore &&
        currentStore.lat &&
        currentStore.lng
      ) {
        const R = 6371e3;
        const dLat = ((currentStore.lat - currentLat) * Math.PI) / 180;
        const dLon = ((currentStore.lng - currentLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((currentLat * Math.PI) / 180) *
            Math.cos((currentStore.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceMeters = Math.round(R * c);
      }

      const uploadedItemsForLine: any[] = [];

      for (const item of surveyCart) {
        let price_tag_url = "";
        let shelf_view_url = "";

        // อัปโหลดไฟล์ภาพป้ายราคาเข้า Storage
        if (item.priceTagFile) {
          const fileExt = item.priceTagFile.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("surveys")
            .upload(`price_tags/${fileName}`, item.priceTagFile);
          if (uploadError)
            throw new Error(
              "รูปป้ายราคาอัปโหลดล้มเหลว: " + uploadError.message,
            );

          const { data: urlData } = supabase.storage
            .from("surveys")
            .getPublicUrl(`price_tags/${fileName}`);
          price_tag_url = urlData.publicUrl;
        }

        // อัปโหลดไฟล์ภาพหน้าชั้นวางเข้า Storage
        if (item.shelfViewFile) {
          const fileExt = item.shelfViewFile.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("surveys")
            .upload(`shelf_views/${fileName}`, item.shelfViewFile);
          if (uploadError)
            throw new Error("รูปชั้นวางอัปโหลดล้มเหลว: " + uploadError.message);

          const { data: urlData } = supabase.storage
            .from("surveys")
            .getPublicUrl(`shelf_views/${fileName}`);
          shelf_view_url = urlData.publicUrl;
        }

        // สืบหาข้อมูล customer_id เพื่อเอามาผูกความสัมพันธ์ตาราง
        let resolvedCustomerId = item.customer_id;
        if (!resolvedCustomerId && item.company) {
          let searchCompanyName = item.company;
          if (
            searchCompanyName === "Riverpro" ||
            searchCompanyName === "riverpro" ||
            searchCompanyName === "rvp"
          ) {
            searchCompanyName = "RVP";
          }
          const { data: custRow } = await supabase
            .from("customers")
            .select("id")
            .eq("name", searchCompanyName)
            .maybeSingle();

          if (custRow) {
            resolvedCustomerId = custRow.id;
          }
        }

        // ประกอบโครงสร้างข้อมูลเตรียมยิงจมลงตาราง price_surveys แบบครบถ้วนทุกช่อง
        const record = {
          area: selectedArea,
          chanel: chanel,
          account: selectedAccount,
          store_code: storeCode,
          store_name: selectedStoreName,
          province: currentStore ? currentStore.province || "" : "",
          region: currentStore ? currentStore.region || "" : "",
          barcode: item.barcode,
          category_code: item.category_code,
          category: item.category,
          sub_category: item.sub_category,
          segment: item.segment,
          company: item.company,
          company_type: item.company_type,
          brand_type: item.brand_type,
          brand: item.brand,
          sub_brand: item.sub_brand,
          pack_name: item.pack_name,
          descriptions: item.descriptions,
          price: parseFloat(item.price) || 0,
          promo_price: parseFloat(item.promo_price) || 0,
          promo_details: item.promo_details || "",
          price_tag_url: price_tag_url || null,
          shelf_view_url: shelf_view_url || null,
          surveyor_name: surveyorName,
          mer_code: merCode,
          lat: currentLat,
          lng: currentLng,
          gps_accuracy: gpsAccuracy,
          distance_meters: distanceMeters,
          off_take: parseInt(item.off_take) || 0,
          customer_id: resolvedCustomerId,
        };

        const { error } = await supabase.from("price_surveys").insert([record]);
        if (error)
          throw new Error(
            `บาร์โค้ด ${item.barcode} บันทึกไม่สำเร็จ: ${error.message}`,
          );

        // 🟢 การันตีการส่งคีย์และตัวแปร URL แนบเข้าไลน์อย่างครบถ้วน (ป้องกันปุ่มกดดูรูปหาย)
        uploadedItemsForLine.push({
          barcode: item.barcode,
          descriptions: item.descriptions,
          price: item.price,
          promo_price: item.promo_price,
          promo_details: item.promo_details,
          off_take: item.off_take,
          company: item.company,
          company_type: item.company_type,
          category: item.category,
          price_tag_url: price_tag_url || null, // URL สดๆ จากถังคลาวด์สำหรับปุ่ม "📸 รูปป้าย"
          shelf_view_url: shelf_view_url || null, // URL สดๆ จากถังคลาวด์สำหรับปุ่ม "📦 รูปชั้น"
          imageurl: item.imageurl || null,
        });
      }

      // 🔔 นำส่งข้อมูลสรุปเข้า LINE OA (Carousel สไลด์แผ่นละ 5 SKU ประหยัดงบ)
      try {
        const res = await fetch("/api/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_name: selectedStoreName,
            surveyor_name: surveyorName,
            items: uploadedItemsForLine,
          }),
        });
        if (!res.ok) console.error("API ส่งไลน์ล้มเหลว:", await res.text());
      } catch (e) {
        console.error("LINE alert failed:", e);
      }

      Swal.fire(
        "สำเร็จ!",
        "บันทึกข้อมูลราคา พิกัดดาวเทียมเพื่อคำนวณ KPI และส่งรายงานไลน์สำเร็จแล้วครับ",
        "success",
      ).then(() => {
        setSurveyCart([]);
        window.location.reload();
      });
    } catch (err: any) {
      Swal.fire("เกิดข้อผิดพลาด", err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "tag" | "shelf",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === "tag") {
        setPriceTagFile(file);
        setPriceTagPreview(url);
      } else {
        setShelfViewFile(file);
        setShelfViewPreview(url);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#EBF3FA] via-[#F3F7FA] to-[#E8EFF5] font-sans pb-12 text-slate-800">
      {/* HEADER BAR STYLE: MODERN 3D GLASSMORPHISM */}
      <header className="bg-white/90 backdrop-blur-md border-b border-white/60 py-4 px-4 sticky top-0 z-50 shadow-[0_10px_30px_rgba(0,91,183,0.06)]">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-bold text-xs bg-white border border-slate-200 hover:border-blue-400 px-3 py-2 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] active:translate-y-0.5 active:shadow-none"
            >
              <ArrowLeft className="w-4 h-4 text-blue-500" /> กลับหน้าหลัก
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] active:translate-y-0.5 active:shadow-none"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* 🏢 ส่วนแสดงผลแบรนด์องค์กร และ ข้อมูลพนักงานล็อกอิน */}
          <div className="flex items-center gap-3.5 bg-gradient-to-r from-white via-slate-50/50 to-blue-50/40 p-3.5 rounded-2xl border border-white shadow-[4px_4px_12px_rgba(0,0,0,0.02),inset_0_1px_3px_rgba(255,255,255,1)]">
            <img
              src="/rvp.png"
              alt="RVP Logo"
              className="w-12 h-12 object-contain drop-shadow-[0_4px_8px_rgba(0,91,183,0.15)] bg-white p-1 rounded-xl border border-slate-100"
            />
            <div className="flex-1">
              <h1 className="text-sm font-black bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 bg-clip-text text-transparent tracking-tight">
                Riverpro Intertrade Co., Ltd
              </h1>

              {/* 👤 🕒 การจัดรวมกลุ่มผู้ใช้งานล็อกอิน และ นาฬิกา Real-time ไว้ที่บรรทัดด้านใต้ชื่อบริษัท */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11px] font-extrabold text-slate-500">
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/60 shadow-sm flex items-center gap-1">
                  👤 {loginName || "กำลังดึงข้อมูล..."} [{loginCode}]
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-indigo-600/90 font-mono tracking-wide">
                  🕒 {currentTime || "กำลังโหลดเวลา..."}
                </span>
              </div>
            </div>
          </div>

          {/* เส้นขีดคั่น Vivid Gradient Line เพิ่มความพรีเมียม */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-[3px] w-full rounded-full shadow-[0_2px_6px_rgba(99,102,241,0.2)]"></div>

          <h2 className="text-slate-700 font-black text-center text-xs tracking-widest uppercase mt-0.5">
            บันทึกข้อมูลสำรวจราคาตลาด
          </h2>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        {/* ส่วนที่ 1: ข้อมูลร้านค้า */}
        <section className="bg-white/95 border border-white/80 rounded-[28px] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03),4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
          <h3 className="text-[11px] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 rounded-xl shadow-[0_4px_12px_rgba(0,91,183,0.25)] inline-block uppercase tracking-wider">
            ส่วนที่ 1: ข้อมูลร้านค้า
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                พื้นที่ (Area)
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200/80 p-2.5 font-semibold bg-slate-50 focus:border-blue-500 focus:bg-white transition-all shadow-inner outline-none"
              >
                <option value="">-- เลือก Area --</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                ห้าง (Account)
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                disabled={!selectedArea}
                className="w-full text-xs rounded-xl border border-slate-200/80 p-2.5 font-semibold bg-slate-50 disabled:opacity-50 transition-all shadow-inner outline-none"
              >
                <option value="">-- รอเลือก Area --</option>
                {accounts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                ชื่อร้านค้า (Store Name)
              </label>
              <select
                value={selectedStoreName}
                onChange={(e) => setSelectedStoreName(e.target.value)}
                disabled={!selectedAccount}
                className="w-full text-xs rounded-xl border border-slate-200/80 p-2.5 font-semibold bg-slate-50 disabled:opacity-50 transition-all shadow-inner outline-none"
              >
                <option value="">-- รอเลือก Account --</option>
                {storeNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                ช่องทาง (Chanel)
              </label>
              <input
                type="text"
                value={chanel}
                readOnly
                placeholder="ระบุอัตโนมัติเมื่อเลือกสาขา"
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                รหัสร้านค้า (Store Code)
              </label>
              <input
                type="text"
                value={storeCode}
                readOnly
                placeholder="ระบุอัตโนมัติเมื่อเลือกสาขา"
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold p-2.5 outline-none"
              />
            </div>
          </div>
        </section>

        {/* ส่วนที่ 2: ข้อมูลสินค้า */}
        <section className="bg-white/95 border border-white/80 rounded-[28px] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03),4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
          <h3 className="text-[11px] font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 rounded-xl shadow-[0_4px_12px_rgba(249,115,22,0.25)] inline-block uppercase tracking-wider">
            ส่วนที่ 2: ข้อมูลสินค้า
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              สแกนบาร์โค้ด / กรอกรหัสสินค้า
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="พิมพ์รหัสสินค้าหรือสแกนป้ายราคา"
                  className="w-full text-xs rounded-xl border border-slate-200 pl-9 pr-3 py-3 font-semibold outline-none transition-all focus:border-blue-500 focus:bg-white shadow-inner bg-slate-50"
                />
              </div>
              <button
                onClick={toggleScanner}
                className={`px-4 rounded-xl font-bold text-white flex items-center justify-center transition-all shadow-[2px_3px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-0.5 active:shadow-none ${isScanning ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-b from-blue-500 to-blue-600"}`}
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSearchProduct()}
                className="px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all shadow-[2px_3px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-0.5 active:shadow-none"
              >
                ค้นหา
              </button>
            </div>
          </div>

          {/* กล้องสแกนเนอร์ */}
          {isScanning && (
            <div className="border-4 border-dashed border-blue-500/80 rounded-2xl overflow-hidden bg-black p-1 shadow-lg">
              <div id="next-reader" className="w-full"></div>
            </div>
          )}

          {/* กล่องแสดงผลลัพธ์ Master Product */}
          {detectedProduct && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3 shadow-inner">
              {(detectedProduct.image_url || detectedProduct.imageurl) && (
                <img
                  src={detectedProduct.image_url || detectedProduct.imageurl}
                  alt="Product"
                  className="w-14 h-14 rounded-xl object-cover border bg-white shadow-sm"
                />
              )}
              <div>
                <small className="block text-[10px] text-blue-600 font-extrabold tracking-wider uppercase">
                  ✓ ผูกข้อมูลสินค้า Master สำเร็จ:
                </small>
                <p className="text-xs font-black text-slate-900 mt-0.5">
                  {detectedProduct.descriptions || detectedProduct.product_name}{" "}
                  <span className="text-indigo-600 font-bold ml-1">
                    [{detectedProduct.brand || "ไม่ระบุแบรนด์"}]
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* ฟิลด์กรอกราคา */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                ราคาขายปกติ (บาท)
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                ราคาโปรโมชั่น (บาท)
              </label>
              <input
                type="number"
                step="0.01"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                placeholder="หากไม่มีใส่ 0"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                รายละเอียดโปรโมชั่น
              </label>
              <input
                type="text"
                value={promoDetails}
                onChange={(e) => setPromoDetails(e.target.value)}
                placeholder="เช่น ซื้อ 2 แถม 1 / ลดท้ายใบเสร็จ"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-semibold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-purple-600 mb-1">
                📈 ยอดขายสินค้า (Off_take)
              </label>
              <input
                type="number"
                value={offTake}
                onChange={(e) => setOffTake(e.target.value)}
                placeholder="ระบุตัวเลขยอดขายในระบบสาขา (ถ้ามี)"
                className="w-full text-xs rounded-xl border border-purple-200 p-2.5 font-bold outline-none bg-purple-50/20 focus:bg-white focus:border-purple-500 shadow-inner transition-all"
              />
            </div>
          </div>
        </section>

        {/* ส่วนที่ 3: อัปโหลดรูปภาพ */}
        <section className="bg-white/95 border border-white/80 rounded-[28px] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03),4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
          <h3 className="text-[11px] font-black text-white bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 rounded-xl shadow-[0_4px_12px_rgba(147,51,234,0.25)] inline-block uppercase tracking-wider">
            ส่วนที่ 3: ถ่ายรูปถ่ายหน้างาน
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* รูปป้ายราคา */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">
                รูปป้ายราคา
              </label>
              <div
                onClick={() => fileInputTag.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer min-h-[130px] flex flex-col items-center justify-center bg-slate-50/50 hover:bg-blue-50/20 transition-all shadow-sm"
              >
                {priceTagPreview ? (
                  <img
                    src={priceTagPreview}
                    alt="Preview Tag"
                    className="max-h-[110px] object-contain rounded-xl shadow-sm border border-white"
                  />
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-slate-400 mb-1.5" />
                    <p className="text-[11px] font-bold text-slate-600">
                      เลือกรูปป้ายราคา
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputTag}
                accept="image/*"
                onChange={(e) => handleImageChange(e, "tag")}
                className="hidden"
              />
            </div>

            {/* รูปหน้าชั้นวาง */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">
                รูปหน้าชั้นวาง
              </label>
              <div
                onClick={() => fileInputShelf.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-purple-500 rounded-2xl p-4 text-center cursor-pointer min-h-[130px] flex flex-col items-center justify-center bg-slate-50/50 hover:bg-purple-50/20 transition-all shadow-sm"
              >
                {shelfViewPreview ? (
                  <img
                    src={shelfViewPreview}
                    alt="Preview Shelf"
                    className="max-h-[110px] object-contain rounded-xl shadow-sm border border-white"
                  />
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-slate-400 mb-1.5" />
                    <p className="text-[11px] font-bold text-slate-600">
                      เลือกรูปหน้าชั้นวาง
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputShelf}
                accept="image/*"
                onChange={(e) => handleImageChange(e, "shelf")}
                className="hidden"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(0,91,183,0.3)] hover:shadow-[0_6px_20px_rgba(0,91,183,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <ShoppingCart className="w-4 h-4" /> เพิ่มสินค้าลงรายการรอส่ง
          </button>
        </section>

        {/* ตะกร้าสินค้าหน้าร้าน */}
        {surveyCart.length > 0 && (
          <section className="bg-white/95 border border-white/80 rounded-[28px] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03),4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-pink-500" />{" "}
                รายการรอส่งสรุปสาขา:{" "}
                <span className="bg-pink-100 text-pink-600 px-2.5 py-0.5 rounded-full font-mono font-black text-xs shadow-sm">
                  {surveyCart.length}
                </span>
              </h4>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-inner bg-slate-50/50">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 border-b border-slate-200/60 font-black">
                    <th className="p-3">บาร์โค้ด</th>
                    <th className="p-3">สินค้า</th>
                    <th className="p-3 text-center">ราคาปกติ</th>
                    <th className="p-3 text-center">ราคาโปรฯ</th>
                    <th className="p-3 text-center">รูปถ่าย</th>
                    <th className="p-3 text-center">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {surveyCart.map((item, index) => (
                    <tr key={index} className="hover:bg-white transition-all">
                      <td className="p-3 font-mono font-black text-slate-900">
                        {item.barcode}
                      </td>
                      <td className="p-3 max-w-[150px] truncate font-bold">
                        {item.descriptions}
                      </td>
                      <td className="p-3 text-center font-black text-slate-900">
                        {item.price}
                      </td>
                      <td className="p-3 text-center font-black text-emerald-600">
                        {item.promo_price !== "0" ? item.promo_price : "-"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          {item.priceTagPreview && (
                            <img
                              src={item.priceTagPreview}
                              className="w-6 h-6 object-cover rounded-md border border-slate-200 shadow-sm"
                            />
                          )}
                          {item.shelfViewPreview && (
                            <img
                              src={item.shelfViewPreview}
                              className="w-6 h-6 object-cover rounded-md border border-slate-200 shadow-sm"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            setSurveyCart(
                              surveyCart.filter((_, i) => i !== index),
                            )
                          }
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleSaveAllSurveys}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              บันทึกข้อมูลราคาเข้าสู่ระบบฐานข้อมูลและส่งรายงาน
            </button>
          </section>
        )}
      </main>

      {/* FOOTER MODULE: PREMIUM IDENTITY */}
      <footer className="max-w-3xl mx-auto px-4 mt-16 text-center space-y-2">
        <div className="bg-gradient-to-r from-transparent via-slate-300 to-transparent h-[1px] w-full"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-4">
          © {new Date().getFullYear()} Riverpro Pulp & Paper Co., Ltd. All
          Rights Reserved.
        </p>
        <p className="text-[10px] font-bold text-slate-400/80">
          Automated Market Intelligence Platform System v1.2.0 • Powered by{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-extrabold">
            FMBD & KOE Team
          </span>
        </p>
      </footer>
    </div>
  );
}
