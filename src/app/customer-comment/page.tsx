/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Search,
  Calendar,
  MapPin,
  ShoppingBag,
  AlertTriangle,
  Coins,
  MessageSquare,
  Star,
  Phone,
  Copy,
  CheckCircle2,
  CornerDownRight,
  TrendingUp,
  Save,
  Home,
  Building2,
  RefreshCw,
} from "lucide-react";
import Swal from "sweetalert2";

interface ReportRow {
  id: string;
  created_at: string;
  date_key?: string;
  month_key?: string;
  auditor_type?: string;
  area?: string;
  account?: string;
  account_name?: string;
  auditor?: string;
  store_name?: string;
  descriptions?: string;
  category_name?: string;
  category?: string;
  brand_name?: string;
  brand?: string;
  oos_reason?: string;
  company?: string;
  price?: number | string;
  promo_price?: number | string;
  promo_details?: string;
  price_tag_image?: string;
  price_tag_url?: string;
  shelf_image?: string;
  shelf_view_url?: string;
  cma_image?: string;
  product_image_url?: string;
  action_plan?: string;
  expected_delivery_date?: string;
  contact_number?: string;
  rating?: number;
  comments?: string;
  admin_reply?: string | null;
  dataType: "oos" | "price";
}

export default function CombinedCustomerCommentPortal() {
  const router = useRouter();

  // --- 📊 State Management ---
  const [rawReports, setRawReports] = useState<ReportRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"oos" | "price" | "comments">(
    "oos",
  );
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [isChartReady, setIsChartReady] = useState(false);

  // --- 🎛️ Filter Controls ---
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("ALL");
  const [filterArea, setFilterArea] = useState<string>("ALL");
  const [filterAccount, setFilterAccount] = useState<string>("ALL");
  const [filterReason, setFilterReason] = useState<string>("ALL");
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from("auditor_feedbacks")
        .select("*");
      if (error) throw error;
      if (data) setFeedbacks(data);
    } catch (err) {
      console.error("Error fetching auditor feedbacks:", err);
    }
  };

  // 🔄 ปรับปรุงฟังก์ชันโหลดข้อมูลใน src/app/customer-comment/page.tsx
  const loadPortalData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. จำกัดให้ดึงข้อมูลฝั่ง OOS ล่าสุดแค่ 200 รายการพอครับ (ไม่ต้องสาดมาหมด 1,800 แถวในทีเดียว)
      const { data: oosData, error: oosError } = await supabase
        .from("vw_executive_warroom")
        .select("*")
        .order("date_key", { ascending: false })
        .limit(200); // 🟢 เพิ่ม Limit เพื่อลดโหลดของ CPU ตัว Server ครับ

      if (oosError) throw oosError;

      // 2. ฝั่งราคาก็จำกัดให้โชว์รายการอัปเดตล่าสุดพอประมาณครับ
      const { data: priceData, error: priceError } = await supabase
        .from("price_surveys")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200); // 🟢 เพิ่ม Limit ตรงนี้ด้วยครับ

      if (priceError) throw priceError;

      const normalizedOos = (oosData || []).map((item: any) => ({
        ...item,
        dataType: "oos" as const,
        company: item.company || "RVP",
        account_name: item.account_name || item.account || "ไม่ระบุ",
      }));

      const companyMap: Record<string, string> = {
        "1": "RVP",
        "2": "LOXLEY",
        "3": "KEWPIE",
      };

      const normalizedPrice = (priceData || []).map((item: any) => {
        const compTag = companyMap[String(item.customer_id)] || "RVP";
        return {
          ...item,
          dataType: "price" as const,
          company: compTag,
          account_name: item.account || "ไม่ระบุ",
          date_key: item.created_at ? item.created_at.slice(0, 10) : "",
          oos_reason: "ไม่มีสินค้าที่ OOS",
          descriptions: item.descriptions || "-",
          auditor: item.auditor || "ทีมสำรวจ",
        };
      });

      setRawReports([...normalizedOos, ...normalizedPrice]);
      await fetchFeedbacks();
    } catch (err) {
      console.error("Portal Fetch System Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  const comprehensiveReports = useMemo(() => {
    return rawReports.map((report) => {
      const foundFeedback = feedbacks.find(
        (f) => String(f.survey_id) === String(report.id),
      );
      return {
        ...report,
        account_name: report.account_name || report.account || "ไม่ระบุ",
        category_name: report.category_name || report.category || "ทั่วไป",
        brand_name: report.brand_name || report.brand || "ทั่วไป",
        price_tag_image: report.price_tag_image || report.price_tag_url,
        shelf_image: report.shelf_image || report.shelf_view_url,
        rating: foundFeedback ? foundFeedback.rating : undefined,
        comments: foundFeedback ? foundFeedback.comments : undefined,
        admin_reply: foundFeedback ? foundFeedback.admin_reply : null,
        feedback_id: foundFeedback ? foundFeedback.id : null,
      };
    });
  }, [rawReports, feedbacks]);

  const options = useMemo(() => {
    return {
      dates: Array.from(
        new Set(
          comprehensiveReports.map(
            (r) => r.date_key || r.created_at?.slice(0, 10),
          ),
        ),
      )
        .filter(Boolean)
        .sort()
        .reverse(),
      areas: Array.from(new Set(comprehensiveReports.map((r) => r.area)))
        .filter(Boolean)
        .sort(),
      accounts: Array.from(
        new Set(comprehensiveReports.map((r) => r.account_name)),
      )
        .filter(Boolean)
        .sort(),
      reasons: Array.from(
        new Set(comprehensiveReports.map((r) => r.oos_reason)),
      )
        .filter(Boolean)
        .sort(),
    };
  }, [comprehensiveReports]);

  const filteredData = useMemo(() => {
    return comprehensiveReports.filter((item) => {
      if (
        selectedCompany !== "ALL" &&
        (item.company || "").toUpperCase() !== selectedCompany.toUpperCase()
      )
        return false;

      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        query === "" ||
        item.store_name?.toLowerCase().includes(query) ||
        item.descriptions?.toLowerCase().includes(query) ||
        item.auditor?.toLowerCase().includes(query);

      const matchDate =
        filterDate === "ALL" ||
        item.date_key === filterDate ||
        item.created_at?.startsWith(filterDate);
      const matchArea = filterArea === "ALL" || item.area === filterArea;
      const matchAccount =
        filterAccount === "ALL" || item.account_name === filterAccount;
      const matchReason =
        filterReason === "ALL" || item.oos_reason === filterReason;

      return (
        matchSearch && matchDate && matchArea && matchAccount && matchReason
      );
    });
  }, [
    comprehensiveReports,
    selectedCompany,
    searchQuery,
    filterDate,
    filterArea,
    filterAccount,
    filterReason,
  ]);

  const analytics = useMemo(() => {
    const total = filteredData.length;
    const oosItems = filteredData.filter(
      (r) =>
        r.dataType === "oos" &&
        r.oos_reason &&
        r.oos_reason !== "ไม่มีสินค้าที่ OOS" &&
        r.oos_reason !== "",
    );
    const totalOOS = oosItems.length;
    const reviewedItems = filteredData.filter((r) => r.rating !== undefined);
    const avgRating =
      reviewedItems.length > 0
        ? (
            reviewedItems.reduce((sum, r) => sum + (r.rating || 0), 0) /
            reviewedItems.length
          ).toFixed(1)
        : "0.0";
    const totalComments = filteredData.filter((r) => r.comments).length;

    const accountStats: Record<
      string,
      { count: number; priceSum: number; promoSum: number }
    > = {};
    filteredData
      .filter((r) => r.dataType === "price")
      .forEach((r) => {
        const acc = r.account_name || "ทั่วไป";
        const p = parseFloat(String(r.price || 0));
        const pm = parseFloat(String(r.promo_price || 0));
        if (!accountStats[acc])
          accountStats[acc] = { count: 0, priceSum: 0, promoSum: 0 };
        accountStats[acc].count += 1;
        accountStats[acc].priceSum += p;
        accountStats[acc].promoSum += pm;
      });

    const chartDataset = Object.entries(accountStats)
      .map(([name, stat]) => ({
        name,
        ราคาปกติเฉลี่ย: parseFloat((stat.priceSum / stat.count).toFixed(2)),
        ราคาโปรโมชันเฉลี่ย: parseFloat((stat.promoSum / stat.count).toFixed(2)),
      }))
      .slice(0, 5);

    return { total, totalOOS, avgRating, totalComments, chartDataset };
  }, [filteredData]);

  const handleGiveFeedback = async (surveyId: string) => {
    const { value: formValues } = await Swal.fire({
      title: "⭐ จำลองการประเมินผลงานทีมสำรวจ",
      html: `
        <div class="text-left font-sans text-xs space-y-3">
          <div>
            <label class="block font-bold text-slate-600 mb-1">เลือกจำนวนดาว</label>
            <select id="swal-rating" class="w-full p-2.5 border rounded-xl bg-slate-50 font-bold outline-none">
              <option value="5">⭐⭐⭐⭐⭐ 5 ดาว (ดีเยี่ยม)</option>
              <option value="4">⭐⭐⭐⭐ 4 ดาว (ดีมาก)</option>
              <option value="3">⭐⭐⭐ 3 ดาว (ปานกลาง)</option>
              <option value="2">⭐⭐ 2 ดาว (ต้องปรับปรุง)</option>
              <option value="1">⭐ 1 ดาว (วิกฤต)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-600 mb-1">ความคิดเห็นหน้างาน</label>
            <textarea id="swal-comment" class="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold outline-none" rows="3" placeholder="พิมพ์ข้อความจำลองจากลูกค้า..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "บันทึกรีวิว",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#2563eb",
      preConfirm: () => ({
        rating: (document.getElementById("swal-rating") as HTMLSelectElement)
          .value,
        comment: (
          document.getElementById("swal-comment") as HTMLTextAreaElement
        ).value,
      }),
    });

    if (formValues) {
      try {
        const { error } = await supabase.from("auditor_feedbacks").insert([
          {
            survey_id: surveyId,
            customer_id: "1",
            rating: parseInt(formValues.rating),
            comments: formValues.comment,
            created_at: new Date().toISOString(),
          },
        ]);
        if (error) throw error;
        Swal.fire("สำเร็จ", "บันทึกรีวิวทดสอบเรียบร้อยครับ", "success");
        await fetchFeedbacks();
      } catch (err) {
        console.error(err);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกฟีดแบ็กได้", "error");
      }
    }
  };

  const handleSaveReply = async (feedbackId: any, rowId: string) => {
    const text = replyTexts[rowId];
    if (!text || text.trim() === "") {
      return Swal.fire(
        "แจ้งเตือน",
        "กรุณากรอกข้อความตอบกลับก่อนครับพี่",
        "warning",
      );
    }

    try {
      if (!feedbackId) {
        return Swal.fire(
          "แจ้งเตือน",
          "รายการนี้ลูกค้ายังไม่มีข้อความคอมเมนต์ดาวส่งเข้ามาครับพี่",
          "info",
        );
      }

      const { error } = await supabase
        .from("auditor_feedbacks")
        .update({ admin_reply: text })
        .eq("id", feedbackId);
      if (error) throw error;
      Swal.fire(
        "สำเร็จ",
        "บันทึกคำตอบกลับส่งต่อข้อมูลให้คู่ค้าเรียบร้อยครับ!",
        "success",
      );
      await fetchFeedbacks();
    } catch (err) {
      console.error(err);
      Swal.fire("ผิดพลาด", "ไม่สามารถอัปเดตคำตอบกลับได้", "error");
    }
  };

  return (
    <div className="min-h-screen text-slate-800 font-sans pb-16 max-w-md mx-auto shadow-2xl bg-white border-x border-slate-200 relative">
      {/* TOP CONSOLE HEADER */}
      <div className="bg-slate-900 text-white sticky top-0 z-50 p-4 shadow-md space-y-3.5">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-white p-1 rounded-lg">
              <img
                src="/rvp.png"
                alt="RVP"
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-tight uppercase">
                Customer View Controller
              </h1>
              <p className="text-[9px] text-cyan-400 font-bold leading-none mt-0.5">
                ศูนย์รวมคอมเมนต์ราคาและวิกฤตสินค้าขาด
              </p>
            </div>
          </div>
          <button
            onClick={() => loadPortalData()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </header>

        {/* COMPANY SELECTOR */}
        <div className="space-y-1">
          <label className="text-[9px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1">
            <Building2 className="w-3 h-3 text-cyan-400" />{" "}
            เลือกดูข้อมูลจำแนกตามบริษัทคู่ค้า
          </label>
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-800 rounded-xl text-[10px] font-black text-center shadow-inner">
            {["ALL", "RVP", "LOXLEY", "KEWPIE"].map((comp) => (
              <button
                key={comp}
                onClick={() => setSelectedCompany(comp)}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${selectedCompany === comp ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="พิมพ์ค้นหาด่วน ชื่อสาขา / รายละเอียดสินค้า..."
            className="w-full pl-9 pr-4 py-2 border border-slate-700 rounded-xl text-xs font-bold bg-slate-800 text-white outline-none focus:border-blue-500 transition-all shadow-inner"
          />
        </div>

        {/* DROPDOWN FILTERS */}
        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60 grid grid-cols-2 gap-1.5 text-[8px]">
          <div>
            <label className="font-bold text-slate-400 block mb-0.5">
              <Calendar className="w-2.5 h-2.5 inline mr-0.5" /> วันที่ตรวจ
            </label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full p-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-md font-bold outline-none"
            >
              <option value="ALL">ทุกวันตรวจ</option>
              {options.dates.map((d, i) => (
                <option key={i} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-400 block mb-0.5">
              <MapPin className="w-2.5 h-2.5 inline mr-0.5" /> เขตพื้นที่ (Area)
            </label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full p-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-md font-bold outline-none"
            >
              <option value="ALL">ทุกพื้นที่</option>
              {options.areas.map((a, i) => (
                <option key={i} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-400 block mb-0.5">
              <ShoppingBag className="w-2.5 h-2.5 inline mr-0.5" /> ช่องทางห้าง
            </label>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full p-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-md font-bold outline-none"
            >
              <option value="ALL">ทุกเครือข่ายห้าง</option>
              {options.accounts.map((acc, i) => (
                <option key={i} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-400 block mb-0.5">
              <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />{" "}
              กลุ่มเหตุผล OOS
            </label>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="w-full p-1 bg-slate-800 text-rose-400 border border-slate-700 rounded-md font-black outline-none"
            >
              <option value="ALL">ทุกเหตุผลสินค้าขาด</option>
              {options.reasons.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="p-4 grid grid-cols-4 gap-2 text-center">
        <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-950 shadow-sm">
          <span className="text-[8px] font-bold text-slate-400 uppercase block">
            Filtered
          </span>
          <p className="text-base font-black font-mono text-cyan-400 mt-0.5">
            {analytics.total}
          </p>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[8px] font-bold uppercase block text-rose-500">
            OOS Total
          </span>
          <p className="text-base font-black font-mono text-rose-600 mt-0.5">
            {analytics.totalOOS}
          </p>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[8px] font-bold text-slate-400 uppercase block">
            Avg Score
          </span>
          <p className="text-base font-black font-mono text-amber-500 mt-0.5 flex items-center justify-center gap-0.5">
            {analytics.avgRating}{" "}
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
          </p>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[8px] font-bold text-slate-400 uppercase block">
            Comments
          </span>
          <p className="text-base font-black font-mono text-indigo-600 mt-0.5">
            {analytics.totalComments}
          </p>
        </div>
      </div>

      {/* 📉 RECHARTS CHART CONTAINER WRAPPER FIXED */}
      <div className="mx-4 mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1 mb-2">
          <TrendingUp className="w-3.5 h-3.5" />{" "}
          สถิติวิเคราะห์เปรียบเทียบราคากลางเฉลี่ยรายห้างสาขา
        </h3>

        {/* เอาเงื่อนไขครอบออก แล้วใช้กล่อง div คุมความกว้างและสไตล์ไว้แทนครับ */}
        <div className="w-full text-[8px]" style={{ minWidth: 0 }}>
          {/* 🟢 จุดสำคัญ: กำหนด height={160} และ minWidth={0} ลงไปที่ ResponsiveContainer ตรงๆ เพื่อตัดบั๊กตัวเลขติดลบและแสดงผลทันที */}
          <ResponsiveContainer width="100%" height={160} minWidth={0}>
            <BarChart
              data={analytics.chartDataset}
              margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={8}
                fontWeight="bold"
              />
              <YAxis stroke="#94a3b8" fontSize={8} fontWeight="bold" />
              <Tooltip
                contentStyle={{ fontSize: "9px", borderRadius: "8px" }}
              />
              <Legend verticalAlign="top" height={20} iconSize={8} />
              <Bar
                dataKey="ราคาปกติเฉลี่ย"
                fill="#0f172a"
                barSize={12}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="ราคาโปรโมชันเฉลี่ย"
                fill="#ea580c"
                barSize={12}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TRI-TAB CONTROLS */}
      <div className="mx-4 mb-4 p-1 bg-slate-200 rounded-xl flex gap-1 shadow-inner text-[10px] font-black">
        <button
          onClick={() => setActiveTab("oos")}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === "oos" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-300/40"}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> บันทึก OOS ขาด
        </button>
        <button
          onClick={() => setActiveTab("price")}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === "price" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-300/40"}`}
        >
          <Coins className="w-3.5 h-3.5 text-amber-500" /> สำรวจราคาโปร
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === "comments" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-300/40"}`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> ฟีดแบ็ก (
          {analytics.totalComments})
        </button>
      </div>

      {/* CARD LIST */}
      <div className="px-4 space-y-3.5">
        {loading ? (
          <p className="text-center py-10 text-xs font-bold text-slate-400 animate-pulse">
            กำลังสแกนฐานข้อมูลคลังระบบอินทราเน็ต...
          </p>
        ) : filteredData.length === 0 ? (
          <p className="text-center py-12 text-xs font-bold text-slate-400 italic">
            📭 ไม่พบฐานข้อมูลบันทึกในเงื่อนไขการเลือกสรรนี้ครับ
          </p>
        ) : (
          <>
            {/* OOS TAB */}
            {activeTab === "oos" &&
              filteredData
                .filter(
                  (r) =>
                    r.dataType === "oos" &&
                    r.oos_reason &&
                    r.oos_reason !== "ไม่มีสินค้าที่ OOS",
                )
                .map((row, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs relative overflow-hidden space-y-3"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <div>
                        <span className="bg-slate-950 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase">
                          🏢 {row.company}: {row.account_name}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 mt-1">
                          🏪 {row.store_name}
                        </h4>
                      </div>
                      <span className="bg-rose-50 border border-rose-100 text-rose-700 text-[8px] font-black px-2 py-0.5 rounded-md">
                        ⚠️ {row.oos_reason}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border text-[10px] space-y-0.5 font-semibold">
                      <p className="font-black text-slate-900">
                        📦 {row.descriptions}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        หมวด: {row.category_name} | แบรนด์: {row.brand_name}
                      </p>
                      {row.expected_delivery_date && (
                        <p className="text-[9px] text-indigo-600 font-black pt-0.5">
                          📅 คาดการณ์ของเข้า: {row.expected_delivery_date}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center text-[8px] font-bold text-slate-400">
                      <div>
                        <span className="block mb-0.5">ป้ายราคา</span>
                        {row.price_tag_image ? (
                          <img
                            src={row.price_tag_image}
                            alt="Price"
                            onClick={() =>
                              window.open(row.price_tag_image, "_blank")
                            }
                            className="h-10 w-full object-cover rounded-md border cursor-pointer"
                          />
                        ) : (
                          <div className="h-10 bg-slate-50 border border-dashed rounded-md flex items-center justify-center text-slate-300">
                            ไม่มีรูป
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="block mb-0.5">ชั้นวาง</span>
                        {row.shelf_image ? (
                          <img
                            src={row.shelf_image}
                            alt="Shelf"
                            onClick={() =>
                              window.open(row.shelf_image, "_blank")
                            }
                            className="h-10 w-full object-cover rounded-md border cursor-pointer"
                          />
                        ) : (
                          <div className="h-10 bg-slate-50 border border-dashed rounded-md flex items-center justify-center text-slate-300">
                            ไม่มีรูป
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="block mb-0.5">จอ CMA</span>
                        {row.cma_image ? (
                          <img
                            src={row.cma_image}
                            alt="CMA"
                            onClick={() => window.open(row.cma_image, "_blank")}
                            className="h-10 w-full object-cover rounded-md border cursor-pointer"
                          />
                        ) : (
                          <div className="h-10 bg-slate-50 border border-dashed rounded-md flex items-center justify-center text-slate-300">
                            ไม่มีรูป
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                      <a
                        href={`tel:${row.contact_number || "065-806-4694"}`}
                        className="flex-1 bg-emerald-600 text-white text-[9px] font-black py-2 rounded-xl text-center flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> โทรจี้สั่งเติมของ DC
                      </a>
                      <button
                        onClick={() => {
                          const txt = `⚠️ [แจ้งเตือนด่วนสินค้าขาดหน้าร้าน]\n🏢 ค่ายคู่ค้า: ${row.company}\n🏪 สาขา: ${row.store_name}\n📦 รายการ: ${row.descriptions}\n🚨 ปัญหา: ${row.oos_reason}\n📌 แแผนหน้างาน: ${row.action_plan || "รอกรรมการเปิดใบสั่งซื้อด่วน"}`;
                          navigator.clipboard.writeText(txt);
                          Swal.fire(
                            "คัดลอกข้อความสำเร็จ",
                            "นำไปวางสั่งการต่อในไลน์กลุ่มได้ทันทีครับพี่นิวัต",
                            "success",
                          );
                        }}
                        className="flex-1 bg-amber-500 text-slate-950 text-[9px] font-black py-2 rounded-xl text-center flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> คัดลอกส่งต่อใน LINE
                      </button>
                    </div>
                  </div>
                ))}

            {/* PRICE TAB */}
            {activeTab === "price" &&
              filteredData
                .filter((r) => r.dataType === "price")
                .map((row, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <div>
                        <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase">
                          🏢 {row.company}: {row.account_name}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 mt-1">
                          🏪 {row.store_name}
                        </h4>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold block">
                        Area: {row.area}
                      </span>
                    </div>
                    <p className="font-black text-slate-900 text-xs">
                      📦 {row.descriptions}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-center font-mono">
                      <div className="bg-slate-900 text-white p-2 rounded-xl border">
                        <span className="text-[8px] font-bold text-slate-400 block font-sans">
                          💵 ราคาปกติ
                        </span>
                        <p className="text-sm font-black text-cyan-400 mt-0.5">
                          {row.price || "0.00"}{" "}
                          <span className="text-[9px] font-sans">บาท</span>
                        </p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 p-2 rounded-xl">
                        <span className="text-[8px] font-bold text-orange-500 block font-sans">
                          🔥 ราคาโปรโมชัน
                        </span>
                        <p className="text-sm font-black text-orange-700 mt-0.5">
                          {row.promo_price || "0.00"}{" "}
                          <span className="text-[9px] font-sans">บาท</span>
                        </p>
                      </div>
                    </div>
                    {row.promo_details && (
                      <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 text-[9px] font-bold text-amber-800">
                        📝 ของแถม/กลยุทธ์: {row.promo_details}
                      </div>
                    )}

                    <div className="flex justify-start gap-3 items-center pt-1">
                      {row.price_tag_image && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                          <img
                            src={row.price_tag_image}
                            alt="Tag"
                            onClick={() =>
                              window.open(row.price_tag_image, "_blank")
                            }
                            className="w-9 h-9 object-cover rounded-md border cursor-pointer"
                          />
                          <span>ป้ายราคา</span>
                        </div>
                      )}
                      {row.shelf_image && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                          <img
                            src={row.shelf_image}
                            alt="Shelf"
                            onClick={() =>
                              window.open(row.shelf_image, "_blank")
                            }
                            className="w-9 h-9 object-cover rounded-md border cursor-pointer"
                          />
                          <span>ชั้นวาง</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400">
                        ผู้ส่งงาน: {row.auditor || "ไม่ระบุ"}
                      </span>
                      <button
                        onClick={() => handleGiveFeedback(row.id)}
                        className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[9px] px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        ⭐ Evaluate ทีมสำรวจ
                      </button>
                    </div>
                  </div>
                ))}

            {/* COMMENTS TAB */}
            {activeTab === "comments" &&
              filteredData
                .filter((r) => r.comments)
                .map((row, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-2">
                      <span className="font-black text-slate-800 uppercase">
                        🏢 [{row.company}] สาขา: {row.store_name}
                      </span>
                      <div className="flex items-center gap-0.5 text-amber-500 font-bold font-mono">
                        {row.rating} <Star className="w-3 h-3 fill-amber-500" />
                      </div>
                    </div>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-slate-700 font-semibold">
                      <p className="text-[9px] text-indigo-500 font-black uppercase mb-0.5">
                        💬 ข้อความความเห็น:
                      </p>
                      {row.comments}
                    </div>
                    {row.admin_reply && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-slate-700 space-y-0.5 ml-4">
                        <p className="text-[9px] text-emerald-600 font-black uppercase flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />{" "}
                          แอดมินสรุปคำตอบกลับแล้ว:
                        </p>
                        <p className="font-bold text-slate-800">
                          {row.admin_reply}
                        </p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 ml-4 space-y-1.5">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                        <CornerDownRight className="w-3 h-3" />
                        <label
                          htmlFor={`reply-input-${row.id}`}
                          className="uppercase"
                        >
                          ตอบกลับคำอธิบายคู่ค้ารายนี้:
                        </label>
                      </div>
                      <div className="flex gap-1">
                        <input
                          id={`reply-input-${row.id}`}
                          type="text"
                          placeholder={
                            row.admin_reply
                              ? "EDIT คำตอบกลับ..."
                              : "ป้อนแผนชี้แจงแก้ไขเรื่องราคา/ของขาด..."
                          }
                          value={replyTexts[row.id] || ""}
                          onChange={(e) =>
                            setReplyTexts({
                              ...replyTexts,
                              [row.id]: e.target.value,
                            })
                          }
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-[10px] font-bold outline-none bg-slate-50 focus:bg-white focus:border-blue-500 shadow-inner"
                        />
                        <button
                          onClick={() =>
                            handleSaveReply(row.feedback_id, row.id)
                          }
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black px-3 rounded-xl transition-all flex items-center gap-0.5 cursor-pointer"
                        >
                          <Save className="w-3 h-3" /> บันทึก
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
          </>
        )}
      </div>

      {/* FOOTER ACTION */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-black px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Home className="w-3.5 h-3.5 text-cyan-400" />{" "}
          กลับสู่หน้าคอนโซลควบคุมหลัก
        </button>
      </div>
    </div>
  );
}
