/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Barcode,
  Camera,
  Package,
  Layers,
  Save,
  RefreshCw,
  ShieldCheck,
  Mail,
  Phone,
  Trash2,
  Image as ImageIcon,
  ChevronDown,
  Tag,
  AlertCircle,
} from "lucide-react";

// 🏢 เปิดจุดเชื่อมต่อฐานข้อมูล Supabase
const _supabase = createClient(
  "https://ryqabfpzjmtujfhslovm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5cWFiZnB6am10dWpmaHNsb3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjE2ODEsImV4cCI6MjA5MjUzNzY4MX0.D2DKpUHQgZmcc_XCTa1wbV0Yak9HCGy1OJHptpQFato",
);

const IMAGE_VIEWS = [
  { id: "front", label: "ด้านหน้า (Main Image)", folder: "front" },
  { id: "back", label: "ด้านหลัง", folder: "back" },
  { id: "top", label: "ด้านบน", folder: "top" },
  { id: "bottom", label: "ด้านล่าง", folder: "bottom" },
  { id: "left", label: "ด้านซ้าย", folder: "left" },
  { id: "right", label: "ด้านขวา", folder: "right" },
  { id: "pricetag", label: "ป้ายราคา", folder: "pricetag" },
  { id: "planogram", label: "Planogram", folder: "planogram" },
];

export default function AddProductPage() {
  const router = useRouter();
  const qrReaderRef = useRef<Html5Qrcode | null>(null);

  // UI States
  const [currentTime, setCurrentTime] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginCode, setLoginCode] = useState("");

  // 📝 🧠 คลังเก็บรายชื่อตัวเลือกมาสเตอร์ดึงสดจากฐานข้อมูลหลังบ้าน
  const [masterCategories, setMasterCategories] = useState<string[]>([]);
  const [masterSubCategories, setMasterSubCategories] = useState<string[]>([]);
  const [masterCategoryCodes, setMasterCategoryCodes] = useState<string[]>([]);
  const [masterCompanies, setMasterCompanies] = useState<string[]>([]);
  const [masterBrands, setMasterBrands] = useState<string[]>([]);
  const [masterSubBrands, setMasterSubBrands] = useState<string[]>([]);

  // 💡 เพิ่มคลังเก็บตัวเลือกดึงสดสำหรับ Company Type และ Brand Type ตามโจทย์ใหม่ครับพี่นิวาส
  const [masterCompanyTypes, setMasterCompanyTypes] = useState<string[]>([]);
  const [masterBrandTypes, setMasterBrandTypes] = useState<string[]>([]);

  // คลังลับสำหรับผูกคู่สายข้อมูลระหว่าง Category ➡️ CategoryCode อัตโนมัติ
  const [categoryCodeMap, setCategoryCodeMap] = useState<{
    [key: string]: string;
  }>({});

  // 🎯 ฟิลด์ตัวเลือกใหม่: NPD หรือ OPD
  const [productStatus, setProductStatus] = useState<"NPD" | "OPD">("OPD");

  // 📝 States สำหรับกรอกโครงสร้างโมเดลสินค้า
  const [barcode, setBarcode] = useState("");
  const [packName, setPackName] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [segment, setSegment] = useState("");
  const [company, setCompany] = useState("");
  const [brand, setBrand] = useState("");
  const [subBrand, setSubBrand] = useState("");
  const [brandType, setBrandType] = useState(""); // เปิดพิมพ์อิสระ + มีตัวเลือก Suggestion
  const [companyType, setCompanyType] = useState(""); // เปิดพิมพ์อิสระ + มีตัวเลือก Suggestion
  const [dimension, setDimension] = useState("");
  const [descriptions, setDescriptions] = useState("");

  // 📷 คลังไฟล์รูปและพรีวิวภาพ 8 ด้าน
  const [imageFiles, setImageFiles] = useState<{ [key: string]: File | null }>(
    {},
  );
  const [imagePreviews, setImagePreviews] = useState<{ [key: string]: string }>(
    {},
  );
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

  // 🔄 2. ตรวจสอบสิทธิ์เซสชันประจำการ + สั่งสแกนโหลดรายชื่อมาสเตอร์คอลัมน์อัตโนมัติ
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedCode = localStorage.getItem("userCode");
    if (!storedName) {
      router.push("/login");
      return;
    }
    setLoginName(storedName);
    setLoginCode(storedCode || "—");

    fetchUniqueMasterLists();
  }, [router]);

  // 🛰️ 🧠 ฟังก์ชันสแกนเจาะข้อมูลทรานแซกชันเก่าดึงชุดตัวเลือกมาดักทำ Auto-suggestion
  const fetchUniqueMasterLists = async () => {
    try {
      const { data, error } = await _supabase
        .from("products")
        .select(
          "category, sub_category, category_code, company, brand, sub_brand, company_type, brand_type",
        );

      if (error) throw error;

      if (data && data.length > 0) {
        setMasterCategories(
          Array.from(new Set(data.map((p) => p.category).filter(Boolean))),
        );
        setMasterSubCategories(
          Array.from(new Set(data.map((p) => p.sub_category).filter(Boolean))),
        );
        setMasterCategoryCodes(
          Array.from(new Set(data.map((p) => p.category_code).filter(Boolean))),
        );
        setMasterCompanies(
          Array.from(new Set(data.map((p) => p.company).filter(Boolean))),
        );
        setMasterBrands(
          Array.from(new Set(data.map((p) => p.brand).filter(Boolean))),
        );
        setMasterSubBrands(
          Array.from(new Set(data.map((p) => p.sub_brand).filter(Boolean))),
        );

        // 💡 ดึงค่าตัวเลือกมาสเตอร์จากประวัติเก่าเข้าชุดสไลด์ลิสต์
        setMasterCompanyTypes(
          Array.from(new Set(data.map((p) => p.company_type).filter(Boolean))),
        );
        setMasterBrandTypes(
          Array.from(new Set(data.map((p) => p.brand_type).filter(Boolean))),
        );

        // สร้างคู่สายจำโครงสร้าง Category ➡️ CategoryCode
        const mappingObj: { [key: string]: string } = {};
        data.forEach((item) => {
          if (item.category && item.category_code) {
            mappingObj[item.category.trim()] = item.category_code
              .toString()
              .trim();
          }
        });
        setCategoryCodeMap(mappingObj);
      }
    } catch (err: any) {
      console.warn(
        "⚠️ แจ้งเตือนสแกนคลังข้อมูล Suggestion เบื้องต้น:",
        err.message,
      );
    }
  };

  // ฟังก์ชันควบคุมการพิมพ์/เลือกหมวดหมู่หลัก แล้วลิ้งก์เปลี่ยนรหัสอัตโนมัติ
  const handleCategoryChange = (val: string) => {
    setCategory(val);
    const cleanedKey = val.trim();
    if (categoryCodeMap[cleanedKey]) {
      setCategoryCode(categoryCodeMap[cleanedKey]);
    }
  };

  // 📷 3. ระบบควบคุมกล้องสแกนป้ายบาร์โค้ดความเร็วสูง
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
        const scanner = new Html5Qrcode("product-reader");
        qrReaderRef.current = scanner;
        scanner
          .start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 260, height: 140 } },
            (decodedText: string) => {
              setBarcode(decodedText);
              Swal.fire({
                icon: "success",
                title: "สแกนสำเร็จ!",
                text: decodedText,
                timer: 1200,
                showConfirmButton: false,
              });
              scanner.stop().then(() => {
                setIsScanning(false);
                qrReaderRef.current = null;
              });
            },
            () => {},
          )
          .catch((err: any) => {
            console.error(err);
            setIsScanning(false);
          });
      }, 300);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    viewId: string,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageFiles((prev) => ({ ...prev, [viewId]: file }));
      setImagePreviews((prev) => ({ ...prev, [viewId]: url }));
    }
  };

  const clearImageView = (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    setImageFiles((prev) => ({ ...prev, [viewId]: null }));
    setImagePreviews((prev) => ({ ...prev, [viewId]: "" }));
    if (fileInputRefs.current[viewId])
      fileInputRefs.current[viewId]!.value = "";
  };

  // 🚀 4. ระบบอัปโหลดรูปภาพลงคลัง Bucket
  const uploadSingleImage = async (viewId: string, folder: string) => {
    const file = imageFiles[viewId];
    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `prod_${barcode.trim()}_${folder}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await _supabase.storage
      .from("product-images")
      .upload(`${folder}/${fileName}`, file);

    if (uploadError)
      throw new Error(`รูปมุม ${viewId} มีปัญหา: ${uploadError.message}`);

    const { data: urlData } = _supabase.storage
      .from("product-images")
      .getPublicUrl(`${folder}/${fileName}`);

    return urlData.publicUrl;
  };

  // 💾 5. ลอจิกรวบรวมฟิลด์ยิงลงฐานข้อมูล
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode.trim()) {
      Swal.fire(
        "ข้อมูลไม่สมบูรณ์",
        "โปรดสแกนหรือระบุบาร์โค้ดตัวสินค้าก่อนกดบันทึกครับ",
        "warning",
      );
      return;
    }

    setIsSubmitting(true);
    Swal.fire({
      title: "กำลังประมวลผลอัปโหลดมาสเตอร์...",
      text: "ระบบกำลังยิงรูปภาพขึ้น Storage และบันทึกข้อมูล ห้ามปิดหน้าจอเด็ดขาดครับ",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const uploadedUrls: { [key: string]: string | null } = {};
      for (const view of IMAGE_VIEWS) {
        uploadedUrls[view.id] = await uploadSingleImage(view.id, view.folder);
      }

      const productRecord = {
        barcode: barcode.trim(),
        pack_name: packName.trim(),
        category: category.trim(),
        sub_category: subCategory.trim(),
        category_code: categoryCode.trim() || null,
        segment: segment,
        company: company.trim(),
        company_type: companyType.trim(),
        brand_type: brandType.trim(),
        brand: brand.trim(),
        sub_brand: subBrand.trim() || null,
        descriptions: descriptions.trim() || null,
        Dimension: dimension.trim() || null,
        is_active: true,
        imageurl: uploadedUrls.front || null,

        img_front: uploadedUrls.front,
        img_back: uploadedUrls.back,
        img_left: uploadedUrls.left,
        img_right: uploadedUrls.right,
        img_top: uploadedUrls.top,
        img_bottom: uploadedUrls.bottom,
        img_price_tag: uploadedUrls.pricetag,
        img_planogram: uploadedUrls.planogram,
      };

      const { error } = await _supabase
        .from("products")
        .insert([productRecord]);
      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "บันทึกมาสเตอร์สำเร็จ!",
        text: `ระบบได้ขึ้นทะเบียนสินค้าสถานะ [ ${productStatus} ] เรียบร้อยแล้วครับพี่!`,
        confirmButtonColor: "#005bb7",
      }).then(() => {
        window.location.reload();
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire("เกิดข้อผิดพลาดในการบันทึก", err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#EBF3FA] via-[#F3F7FA] to-[#E8EFF5] font-sans pb-12 text-slate-800">
      {/* 🏢 DATALIST CUSTOM AUTO-SUGGESTIONS MODULES */}
      <datalist id="master-categories-list">
        {masterCategories.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="master-subcategories-list">
        {masterSubCategories.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="master-categorycodes-list">
        {masterCategoryCodes.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="master-companies-list">
        {masterCompanies.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="master-brands-list">
        {masterBrands.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="master-subbrands-list">
        {masterSubBrands.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {/* 💡 เพิ่ม Datalist ผูก Suggestion สองตัวแปรใหม่ตามสั่งครับพี่นิวาส */}
      <datalist id="master-company-types-list">
        {masterCompanyTypes.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="master-brand-types-list">
        {masterBrandTypes.map((item) => (
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
        <form onSubmit={handleSaveProduct} className="space-y-6">
          <section className="bg-white/95 border border-white/80 rounded-[28px] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03),4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-[11px] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 rounded-xl shadow-[0_4px_12_rgba(0,91,183,0.25)] inline-block uppercase tracking-wider">
                <Package className="w-3.5 h-3.5 inline mr-1" /> ส่วนที่ 1:
                ข้อมูลสินค้ามาสเตอร์กลาง
              </h3>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                <span className="text-[10px] font-black text-slate-500 px-2 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-indigo-600" /> PRODUCT TYPE:
                </span>
                <button
                  type="button"
                  onClick={() => setProductStatus("NPD")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all shadow-sm ${
                    productStatus === "NPD"
                      ? "bg-gradient-to-b from-orange-500 to-red-600 text-white ring-2 ring-red-200"
                      : "bg-white text-slate-400 hover:text-slate-600"
                  }`}
                >
                  🔥 NPD (สินค้าใหม่แกะกล่อง)
                </button>
                <button
                  type="button"
                  onClick={() => setProductStatus("OPD")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all shadow-sm ${
                    productStatus === "OPD"
                      ? "bg-slate-800 text-amber-400 ring-2 ring-slate-700"
                      : "bg-white text-slate-400 hover:text-slate-600"
                  }`}
                >
                  📦 OPD (สินค้าเดิมเติมฐานข้อมูล)
                </button>
              </div>
            </div>

            {productStatus === "NPD" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2 text-orange-800">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] font-bold leading-relaxed">
                  <strong>โหมดติดตามความเคลื่อนไหวตลาด (NPD):</strong>{" "}
                  รายการนี้จะถูกจัดลงรายงานสินค้าใหม่เพื่อปรับกลยุทธ์สู้กับคู่แข่งได้แบบทันท่วงทีครับ
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  บาร์โค้ดสินค้า (Barcode)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="สแกนป้ายบาร์โค้ดหรือคีย์รหัสตัวเลขสินค้าที่นี่"
                      className="w-full text-xs rounded-xl border border-blue-200 pl-9 pr-3 py-3 font-bold bg-blue-50/10 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleScanner}
                    className={`px-4 rounded-xl font-bold text-white flex items-center justify-center transition-all shadow-md active:translate-y-0.5 ${isScanning ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-b from-blue-500 to-blue-600"}`}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isScanning && (
                <div className="sm:col-span-2 md:col-span-3 border-4 border-dashed border-blue-500 rounded-2xl overflow-hidden bg-black p-1">
                  <div id="product-reader" className="w-full"></div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  หมวดหมู่หลัก (Category)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    list="master-categories-list"
                    placeholder="เลือกหรือพิมพ์เพิ่มเอง..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                    required
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  หมวดหมู่อย่างย่อย (SubCategory)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    list="master-subcategories-list"
                    placeholder="เลือกหรือพิมพ์เพิ่มเอง..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                    required
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  รหัสหมวดหมู่สินค้า (CategoryCode)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={categoryCode}
                    onChange={(e) => setCategoryCode(e.target.value)}
                    list="master-categorycodes-list"
                    placeholder="รหัสจะขึ้นอัตโนมัติ หรือพิมพ์เพิ่มเอง..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-mono font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ชื่อแพ็คเกจ/ขนาดบรรจุ (PackName)
                </label>
                <input
                  type="text"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  placeholder="เช่น 24 ม้วน x 3 แพ็ค"
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  กลุ่ม Segment สินค้า (Segment) *
                </label>
                <div className="relative">
                  <select
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:border-blue-500 outline-none shadow-inner transition-all appearance-none pr-8"
                    required
                  >
                    <option value="">-- เลือกระดับ Segment --</option>
                    <option value="Premium">Premium</option>
                    <option value="Standard">Standard</option>
                    <option value="ECO">ECO</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  บริษัทผู้ผลิต (Company)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    list="master-companies-list"
                    placeholder="เลือกหรือพิมพ์เพิ่มเอง..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                    required
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* 💡 ปรับให้เป็นอินพุตดึงตัวเลือกอัตโนมัติ พิมพ์เพิ่มเองได้ตามเงื่อนไขใหม่ครับ */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ประเภทบริษัท (Company Type) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value)}
                    list="master-company-types-list"
                    placeholder="เลือกหรือพิมพ์เพิ่มประเภทบริษัท..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                    required
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* 💡 ปรับให้เป็นอินพุตดึงตัวเลือกอัตโนมัติ พิมพ์เพิ่มเองได้ตามเงื่อนไขใหม่ครับ */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ประเภทแบรนด์ (BrandType) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={brandType}
                    onChange={(e) => setBrandType(e.target.value)}
                    list="master-brand-types-list"
                    placeholder="เลือกหรือพิมพ์เพิ่มประเภทแบรนด์..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                    required
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ยี่ห้อสินค้า (Brand)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    list="master-brands-list"
                    placeholder="เลือกหรือพิมพ์เพิ่มเอง..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                    required
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  แบรนด์ย่อย (SubBrand)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={subBrand}
                    onChange={(e) => setSubBrand(e.target.value)}
                    list="master-subbrands-list"
                    placeholder="เลือกหรือพิมพ์เพิ่มเอง..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none shadow-sm transition-all pr-8"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ขนาดมิติสินค้า (Dimension)
                </label>
                <input
                  type="text"
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                  placeholder="เช่น 10 x 20 x 5 cm"
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-semibold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  คำอธิบายรายละเอียดลักษณะสินค้า (Descriptions)
                </label>
                <textarea
                  value={descriptions}
                  onChange={(e) => setDescriptions(e.target.value)}
                  rows={2}
                  placeholder="ระบุสูตรเยื่อกระดาษ ลวดลาย หรือลักษณะเด่นพิเศษ..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-medium bg-slate-50 focus:bg-white focus:border-blue-500 outline-none shadow-inner transition-all"
                />
              </div>
            </div>
          </section>

          <section className="bg-white/95 border border-white/80 rounded-[24px] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03),4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-[11px] font-black text-white bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 rounded-xl shadow-[0_4px_12_rgba(147,51,234,0.25)] inline-block uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 inline mr-1" /> ส่วนที่ 2:
                รูปภาพประกอบโมเดลสินค้า (8 ทิศทาง)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {IMAGE_VIEWS.map((view) => (
                <div key={view.id} className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block pl-1">
                    {view.label}
                  </label>
                  <div
                    onClick={() => fileInputRefs.current[view.id]?.click()}
                    className={`border-2 border-dashed rounded-2xl p-3 text-center cursor-pointer min-h-[135px] flex flex-col items-center justify-center transition-all bg-slate-50/50 relative group overflow-hidden ${imagePreviews[view.id] ? "border-orange-500 bg-orange-50/10 shadow-sm" : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"}`}
                  >
                    {imagePreviews[view.id] ? (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <img
                          src={imagePreviews[view.id]}
                          alt={view.label}
                          className="max-h-[110px] object-contain rounded-xl shadow-inner border border-white"
                        />
                        <button
                          type="button"
                          onClick={(e) => clearImageView(e, view.id)}
                          className="absolute top-0.5 right-0.5 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md z-10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 text-slate-400 group-hover:scale-110 group-hover:text-blue-500 transition-all mb-1" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                          {view.id}
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={(el) => {
                      fileInputRefs.current[view.id] = el;
                    }}
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, view.id)}
                    className="hidden"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white font-black py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,91,183,0.3)] hover:shadow-[0_6px_25px_rgba(0,91,183,0.4)] transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                "กำลังบันทึก..."
              ) : (
                <>
                  <Save className="w-4 h-4" />{" "}
                  บันทึกข้อมูลสินค้ามาสเตอร์เข้าสู่ระบบฐานข้อมูลกลาง (Master
                  Product)
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
