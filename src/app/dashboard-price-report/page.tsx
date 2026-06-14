"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Search,
  RefreshCw,
  Home,
  MapPin,
  ShoppingBag,
  Layers,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  FileText,
  UserCheck,
  MessageSquare,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import Chart from "chart.js/auto";

const _supabase = createClient(
  "https://ryqabfpzjmtujfhslovm.supabase.co",
  "sb_publishable_RhkCtuGUUeaG9ScGoyS1vw_zCCDumnl",
);

export default function AdvancedStrategicDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const [pendingCommentsCount] = useState(4); // ตัวเลข Task คอมเมนต์หน้าร้านค้างตอบ

  // 🎛️ Filter Options Lists
  const [areas, setAreas] = useState<string[]>([]);
  const [areaCodes, setAreaCodes] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<
    { value: string; label: string }[]
  >([]);

  // 🎯 Selected Filters State
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fArea, setFArea] = useState("");
  const [fAreaCode, setFAreaCode] = useState("");
  const [fAccount, setFAccount] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fCompanyType, setFCompanyType] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 📊 Chart References
  const compareChartRef = useRef<HTMLCanvasElement | null>(null);
  const areaStoreChartRef = useRef<HTMLCanvasElement | null>(null);
  const promoTrendChartRef = useRef<HTMLCanvasElement | null>(null);

  const compareChartInstance = useRef<Chart | null>(null);
  const areaStoreChartInstance = useRef<Chart | null>(null);
  const promoTrendChartInstance = useRef<Chart | null>(null);

  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleString("th-TH", {
          dateStyle: "long",
          timeStyle: "medium",
        }),
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (rawData.length > 0) {
      handleFilter();
    }
  }, [
    searchTerm,
    fStart,
    fEnd,
    fArea,
    fAreaCode,
    fAccount,
    fCategory,
    fCompanyType,
    fMonth,
    rawData,
  ]);

  useEffect(() => {
    if (filteredData.length > 0) {
      buildAdvancedCharts();
    }
  }, [filteredData]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data, error } = await _supabase
        .from("price_surveys")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) throw error;

      if (data) {
        setRawData(data);
        setFilteredData(data);

        setAreas(
          [
            ...new Set(data.map((i: any) => i.area).filter(Boolean)),
          ].sort() as string[],
        );
        setAreaCodes(
          [
            ...new Set(data.map((i: any) => i.mer_code).filter(Boolean)),
          ].sort() as string[],
        );
        setAccounts(
          [
            ...new Set(data.map((i: any) => i.account).filter(Boolean)),
          ].sort() as string[],
        );
        setCategories(
          [
            ...new Set(
              data
                .map((i: any) => i.category || i.categorycode)
                .filter(Boolean),
            ),
          ].sort() as string[],
        );
        setCompanies(
          [
            ...new Set(data.map((i: any) => i.company).filter(Boolean)),
          ].sort() as string[],
        );

        const monthMap = new Map();
        data.forEach((item: any) => {
          if (item.created_at) {
            const d = new Date(item.created_at);
            const yearStr = d.getFullYear() + 543;
            const monthStr = thaiMonths[d.getMonth()];
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = `${monthStr} ${yearStr}`;
            if (!monthMap.has(key)) {
              monthMap.set(key, { value: key, label: label });
            }
          }
        });
        setAvailableMonths(
          Array.from(monthMap.values()).sort((a, b) =>
            b.value.localeCompare(a.value),
          ),
        );
      }
    } catch (err: any) {
      console.error("Dashboard Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let result = [...rawData];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          (item.store_name && item.store_name.toLowerCase().includes(term)) ||
          (item.brand && item.brand.toLowerCase().includes(term)) ||
          (item.descriptions &&
            item.descriptions.toLowerCase().includes(term)) ||
          (item.surveyor_name &&
            item.surveyor_name.toLowerCase().includes(term)) ||
          (item.mer_code && item.mer_code.toLowerCase().includes(term)),
      );
    }

    if (fStart) result = result.filter((item) => item.created_at >= fStart);
    if (fEnd)
      result = result.filter((item) => item.created_at <= fEnd + "T23:59:59");
    if (fArea) result = result.filter((item) => item.area === fArea);
    if (fAreaCode)
      result = result.filter((item) => item.mer_code === fAreaCode);
    if (fAccount) result = result.filter((item) => item.account === fAccount);
    if (fCategory)
      result = result.filter(
        (item) => (item.category || item.categorycode) === fCategory,
      );
    if (fCompanyType)
      result = result.filter((item) => item.company === fCompanyType);

    if (fMonth) {
      result = result.filter(
        (item) => item.created_at && item.created_at.startsWith(fMonth),
      );
    }

    setFilteredData(result);
  };

  const rvpProducts = filteredData.filter((i) => i.company === "RVP");
  const competitorProducts = filteredData.filter((i) => i.company !== "RVP");

  const avgPriceRVP =
    rvpProducts.length > 0
      ? Math.round(
          rvpProducts.reduce(
            (acc, curr) => acc + (parseFloat(curr.price) || 0),
            0,
          ) / rvpProducts.length,
        )
      : 0;
  const avgPriceComp =
    competitorProducts.length > 0
      ? Math.round(
          competitorProducts.reduce(
            (acc, curr) => acc + (parseFloat(curr.price) || 0),
            0,
          ) / competitorProducts.length,
        )
      : 0;

  const getExtremeAccount = (
    type: "max_normal" | "min_normal" | "max_promo" | "min_promo",
  ) => {
    if (filteredData.length === 0) return { account: "-", price: 0 };
    let targetRow = null;

    if (type === "max_normal") {
      targetRow = filteredData.reduce(
        (max, row) =>
          (parseFloat(row.price) || 0) > (parseFloat(max.price) || 0)
            ? row
            : max,
        filteredData[0],
      );
      return {
        account: targetRow?.account || "-",
        price: targetRow?.price || 0,
      };
    }
    if (type === "min_normal") {
      const validRows = filteredData.filter(
        (row) => (parseFloat(row.price) || 0) > 0,
      );
      if (validRows.length === 0) return { account: "-", price: 0 };
      targetRow = validRows.reduce(
        (min, row) =>
          (parseFloat(row.price) || 0) < (parseFloat(min.price) || 0)
            ? row
            : min,
        validRows[0],
      );
      return {
        account: targetRow?.account || "-",
        price: targetRow?.price || 0,
      };
    }
    if (type === "max_promo") {
      const validRows = filteredData.filter(
        (row) => (parseFloat(row.promo_price) || 0) > 0,
      );
      if (validRows.length === 0) return { account: "-", price: 0 };
      targetRow = validRows.reduce(
        (max, row) =>
          (parseFloat(row.promo_price) || 0) >
          (parseFloat(max.promo_price) || 0)
            ? row
            : max,
        validRows[0],
      );
      return {
        account: targetRow?.account || "-",
        price: targetRow?.promo_price || 0,
      };
    }
    if (type === "min_promo") {
      const validRows = filteredData.filter(
        (row) => (parseFloat(row.promo_price) || 0) > 0,
      );
      if (validRows.length === 0) return { account: "-", price: 0 };
      targetRow = validRows.reduce(
        (min, row) =>
          (parseFloat(row.promo_price) || 0) <
          (parseFloat(min.promo_price) || 0)
            ? row
            : min,
        validRows[0],
      );
      return {
        account: targetRow?.account || "-",
        price: targetRow?.promo_price || 0,
      };
    }
    return { account: "-", price: 0 };
  };

  const buildAdvancedCharts = () => {
    if (compareChartInstance.current) compareChartInstance.current.destroy();
    if (areaStoreChartInstance.current)
      areaStoreChartInstance.current.destroy();
    if (promoTrendChartInstance.current)
      promoTrendChartInstance.current.destroy();

    if (compareChartRef.current) {
      const ctx = compareChartRef.current.getContext("2d");
      if (ctx) {
        const gradRVP = ctx.createLinearGradient(0, 0, 0, 300);
        gradRVP.addColorStop(0, "#3b82f6");
        gradRVP.addColorStop(1, "#1d4ed8");
        const gradComp = ctx.createLinearGradient(0, 0, 0, 300);
        gradComp.addColorStop(0, "#ff4d4d");
        gradComp.addColorStop(1, "#b30000");

        const uniqueCats = [
          ...new Set(filteredData.map((i) => i.category || "Tissue Paper")),
        ].slice(0, 5);
        const rvpDataset = uniqueCats.map(
          (cat) =>
            filteredData.filter(
              (i) => i.category === cat && i.company === "RVP",
            ).length,
        );
        const compDataset = uniqueCats.map(
          (cat) =>
            filteredData.filter(
              (i) => i.category === cat && i.company !== "RVP",
            ).length,
        );

        compareChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: uniqueCats,
            datasets: [
              {
                label: "สินค้าหลัก RVP",
                data: rvpDataset,
                backgroundColor: gradRVP,
                borderRadius: 6,
              },
              {
                label: "สินค้าคู่แข่ง",
                data: compDataset,
                backgroundColor: gradComp,
                borderRadius: 6,
              },
            ],
          },
          options: {
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
          },
        });
      }
    }

    if (areaStoreChartRef.current) {
      const ctx = areaStoreChartRef.current.getContext("2d");
      if (ctx) {
        const areaMap: any = {};
        filteredData.forEach((row) => {
          if (row.area) {
            if (!areaMap[row.area]) areaMap[row.area] = new Set();
            areaMap[row.area].add(row.store_name);
          }
        });
        const labels = Object.keys(areaMap);
        const dataValues = labels.map((a) => areaMap[a].size);

        areaStoreChartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: labels,
            datasets: [
              {
                data: dataValues,
                backgroundColor: [
                  "#00e5ff",
                  "#ff9100",
                  "#00e676",
                  "#d500f9",
                  "#ff1744",
                  "#2979ff",
                ],
              },
            ],
          },
          options: { maintainAspectRatio: false },
        });
      }
    }

    if (promoTrendChartRef.current) {
      const ctx = promoTrendChartRef.current.getContext("2d");
      if (ctx) {
        const validPromoRows = [...filteredData]
          .filter(
            (row) => (parseFloat(row.promo_price) || 0) > 0 && row.created_at,
          )
          .sort((a, b) => a.created_at.localeCompare(b.created_at));

        const dateMap = new Map();
        validPromoRows.forEach((row) => {
          const d = new Date(row.created_at);
          const dateLabel = d.toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
          });

          if (!dateMap.has(dateLabel)) {
            dateMap.set(dateLabel, {
              rvpSum: 0,
              rvpCount: 0,
              compSum: 0,
              compCount: 0,
            });
          }

          const stats = dateMap.get(dateLabel);
          const priceVal = parseFloat(row.promo_price) || 0;
          if (row.company === "RVP") {
            stats.rvpSum += priceVal;
            stats.rvpCount++;
          } else {
            stats.compSum += priceVal;
            stats.compCount++;
          }
        });

        const timelineLabels = Array.from(dateMap.keys());
        const rvpPromoLine = timelineLabels.map((d) => {
          const s = dateMap.get(d);
          return s.rvpCount > 0 ? Math.round(s.rvpSum / s.rvpCount) : null;
        });
        const compPromoLine = timelineLabels.map((d) => {
          const s = dateMap.get(d);
          return s.compCount > 0 ? Math.round(s.compSum / s.compCount) : null;
        });

        promoTrendChartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: timelineLabels,
            datasets: [
              {
                label: "ราคาโปรโมชัน RVP เฉลี่ย",
                data: rvpPromoLine,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.05)",
                borderWidth: 4,
                tension: 0.3,
                pointRadius: 4,
                spanGaps: true,
              },
              {
                label: "ราคาโปรโมชัน คู่แข่งเฉลี่ย",
                data: compPromoLine,
                borderColor: "#dc2626", //  ใส่เครื่องหมายคำพูดครอบโค้ดสีแดงเรียบร้อยครับ
                backgroundColor: "rgba(220, 38, 38, 0.05)",
                borderWidth: 4,
                tension: 0.3,
                pointRadius: 4,
                spanGaps: true,
              },
            ],
          },
          options: {
            maintainAspectRatio: false,
            plugins: { tooltip: { mode: "index", intersect: false } },
            scales: { y: { beginAtZero: true } },
          },
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-4 flex flex-col justify-between">
      <div>
        <nav className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/rvp.png"
                alt="RVP Logo"
                className="h-11 w-11 object-contain bg-white p-1 rounded-xl shadow-inner"
              />
              <div>
                <h1 className="text-base font-black tracking-tight leading-none">
                  Riverpro Intertrade
                </h1>
                <span className="text-xs text-cyan-400 font-bold tracking-wide">
                  FMBD Operations Executive Command Center
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {currentTime}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => router.push("/customer-comment")}
                className="relative flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black rounded-xl transition-all"
              >
                <MessageSquare className="w-4 h-4 animate-bounce" />
                <span>Pending Comment Tasks</span>
                <span className="bg-amber-500 text-slate-900 font-mono text-[10px] px-1.5 py-0.5 rounded-md ml-1 font-black shadow-md">
                  {pendingCommentsCount}
                </span>
              </button>
              <button
                onClick={fetchInitialData}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold rounded-xl"
              >
                <Home className="w-3.5 h-3.5" /> หน้าหลัก
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm border-l-4 border-l-blue-600">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                ราคาเฉลี่ย ค่ายหลัก RVP
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                {avgPriceRVP.toLocaleString()}{" "}
                <span className="text-xs font-bold text-slate-400">บาท</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                คัดสรรกรอง {rvpProducts.length} ข้อมูลจำเพาะ
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm border-l-4 border-l-rose-600">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                ราคาเฉลี่ย ค่ายคู่แข่ง
              </span>
              <h3 className="text-xl font-black text-rose-600 mt-1">
                {avgPriceComp.toLocaleString()}{" "}
                <span className="text-xs font-bold text-slate-400">บาท</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                Gap ส่วนต่างราคาเฉลี่ย: {Math.abs(avgPriceRVP - avgPriceComp)}{" "}
                บาท
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" />{" "}
                ราคาปกติ สูงสุด-ต่ำสุด
              </span>
              <div className="text-[11px] font-semibold bg-slate-50 p-2 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-400 truncate max-w-[100px]">
                    Max: {getExtremeAccount("max_normal").account}
                  </span>{" "}
                  <span className="font-black text-slate-800 font-mono">
                    {getExtremeAccount("max_normal").price}฿
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-400 truncate max-w-[100px]">
                    Min: {getExtremeAccount("min_normal").account}
                  </span>{" "}
                  <span className="font-black text-emerald-600 font-mono">
                    {getExtremeAccount("min_normal").price}฿
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                <ArrowDownCircle className="w-3.5 h-3.5 text-rose-500" />{" "}
                ราคาโปรโมชั่น สูงสุด-ต่ำสุด
              </span>
              <div className="text-[11px] font-semibold bg-slate-50 p-2 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-400 truncate max-w-[100px]">
                    Max Promo: {getExtremeAccount("max_promo").account}
                  </span>{" "}
                  <span className="font-black text-rose-600 font-mono">
                    {getExtremeAccount("max_promo").price}฿
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-400 truncate max-w-[100px]">
                    Min Promo: {getExtremeAccount("min_promo").account}
                  </span>{" "}
                  <span className="font-black text-amber-600 font-mono">
                    {getExtremeAccount("min_promo").price}฿
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  แผงควบคุมและกรองข้อมูลขั้นสูง
                </h4>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="พิมพ์ค้นหา ชื่อร้าน, แบรนด์, รายละเอียด..."
                  className="w-full text-xs border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> เริ่มวันที่
                </label>
                <input
                  type="date"
                  value={fStart}
                  onChange={(e) => setFStart(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> สิ้นสุดวันที่
                </label>
                <input
                  type="date"
                  value={fEnd}
                  onChange={(e) => setFEnd(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> ประจำเดือน (Month)
                </label>
                <select
                  value={fMonth}
                  onChange={(e) => setFMonth(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl font-bold"
                >
                  <option value="">ทั้งหมด</option>
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Area Group
                </label>
                <select
                  value={fArea}
                  onChange={(e) => setFArea(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl font-bold"
                >
                  <option value="">ทั้งหมด</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Area Code (Mer)
                </label>
                <select
                  value={fAreaCode}
                  onChange={(e) => setFAreaCode(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl font-bold"
                >
                  <option value="">ทั้งหมด</option>
                  {areaCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Category
                </label>
                <select
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl font-bold"
                >
                  <option value="">ทั้งหมด</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" /> ห้างแบรนด์
                </label>
                <select
                  value={fAccount}
                  onChange={(e) => setFAccount(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl font-bold"
                >
                  <option value="">ทั้งหมด</option>
                  {accounts.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> สังกัดบริษัท
                </label>
                <select
                  value={fCompanyType}
                  onChange={(e) => setFCompanyType(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl font-bold"
                >
                  <option value="">ทั้งหมด</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h5 className="text-xs font-black text-blue-600 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />{" "}
                ดัชนีกลยุทธ์เปรียบเทียบสงครามราคาโปรโมชันคู่ขนาน (Strategic
                Promotion Price-Matching Trend)
              </h5>
              <div className="h-60 relative">
                <canvas ref={promoTrendChartRef}></canvas>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-3">
                <h5 className="text-xs font-black text-blue-600 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />{" "}
                  สถิติจำนวนรายการสินค้าสำรวจเปรียบเทียบสัดส่วน (RVP VS
                  Competitor) ตามกลุ่มสินค้า
                </h5>
                <div className="h-56 relative">
                  <canvas ref={compareChartRef}></canvas>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
                <h5 className="text-xs font-black text-blue-600 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />{" "}
                  สัดส่วนจำนวนความหนาแน่นจุดร้านค้าจำแนกตามพื้นที่การตลาด (Area)
                </h5>
                <div className="h-56 relative">
                  <canvas ref={areaStoreChartRef}></canvas>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h5 className="text-xs font-black uppercase tracking-widest mb-0 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />{" "}
                ตารางสรุปพิกัดข้อมูลราคาตลาดและรายละเอียดรูปเล่ม
              </h5>
              <span className="text-[11px] font-bold bg-cyan-500 text-slate-950 px-2.5 py-0.5 rounded-full font-mono">
                Rows Count: {filteredData.length}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 shadow-sm">
                  <tr className="font-black text-slate-500">
                    <th className="p-3">วัน/เวลา</th>
                    <th className="p-3">Area</th>
                    <th className="p-3">รหัสสายรถ</th>
                    <th className="p-3">ร้านค้า (Store Name)</th>
                    <th className="p-3">สินค้า (Product Details)</th>
                    <th className="p-3 text-center">ราคาปกติ</th>
                    <th className="p-3 text-center">ราคาโปรฯ</th>
                    {/* 🛠️ ล้างกลุ่มปุ่มไอคอน สลับกลับมาแยก 2 คอลัมน์ รูปป้าย/รูปชั้นวาง ฉบับ Preview จบงานเนี๊ยบตามเดิมครับพี่ */}
                    <th className="p-3 text-center">รูปป้าย</th>
                    <th className="p-3 text-center">รูปชั้นวาง</th>
                    <th className="p-3">ผู้รายงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-8 font-bold text-slate-400"
                      >
                        กำลังประมวลผลคำนวณโครงสร้างตารางข้อมูล...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-8 font-bold text-slate-400"
                      >
                        ไม่พบรายงานตรงตามคำค้นหาหรือตัวกรองของท่านในขณะนี้
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => {
                      const isOffSite =
                        (parseFloat(item.distance_meters) || 0) > 500;
                      return (
                        <tr
                          key={index}
                          className={`hover:bg-slate-50/60 transition-all ${isOffSite ? "bg-rose-50/30" : ""}`}
                        >
                          <td className="p-3 whitespace-nowrap font-mono text-slate-500">
                            {new Date(item.created_at).toLocaleString("th-TH", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                              {item.area || "-"}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-700">
                            {item.mer_code || "-"}
                          </td>
                          <td className="p-3">
                            <div className="font-black text-slate-900">
                              {item.store_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              ห้าง: {item.account || "-"}
                            </div>
                          </td>
                          <td className="p-3 max-w-[220px]">
                            <div className="font-black text-blue-700 truncate">
                              {item.brand || "-"}
                            </div>
                            <div className="text-[10px] text-slate-900 font-bold mt-0.5 whitespace-pre-wrap leading-tight">
                              {item.descriptions || "-"}
                            </div>
                            <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                              ค่าย: {item.company || "-"} |{" "}
                              {item.category || "Tissue Paper"}
                            </div>
                          </td>
                          <td className="p-3 text-center font-black text-slate-900 text-xs">
                            {(item.price || 0).toLocaleString()} ฿
                          </td>
                          <td className="p-3 text-center font-black text-rose-600 text-xs">
                            {item.promo_price > 0
                              ? `${item.promo_price.toLocaleString()} ฿`
                              : "-"}
                          </td>

                          {/* 🖼️ คอลัมน์ รูปป้ายราคา (มี Preview และกดขยายดูได้) */}
                          <td className="p-3 text-center">
                            {item.price_tag_url ? (
                              <img
                                src={item.price_tag_url}
                                alt="ป้ายราคา"
                                onClick={() =>
                                  window.open(item.price_tag_url, "_blank")
                                }
                                className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-110 active:scale-95 transition-all mx-auto shadow-sm"
                              />
                            ) : (
                              <span className="text-slate-300 font-normal">
                                -
                              </span>
                            )}
                          </td>

                          {/* 🖼️ คอลัมน์ รูปภาพชั้นวางสินค้า (มี Preview และกดขยายดูได้) */}
                          <td className="p-3 text-center">
                            {item.shelf_view_url ? (
                              <img
                                src={item.shelf_view_url}
                                alt="ชั้นวางสินค้า"
                                onClick={() =>
                                  window.open(item.shelf_view_url, "_blank")
                                }
                                className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-110 active:scale-95 transition-all mx-auto shadow-sm"
                              />
                            ) : (
                              <span className="text-slate-300 font-normal">
                                -
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="font-black text-slate-700">
                              {item.surveyor_name || "-"}
                            </div>
                            {isOffSite && (
                              <span className="inline-block mt-1 text-[9px] font-extrabold bg-rose-100 text-rose-600 px-1.5 rounded">
                                Off-site
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <footer className="mt-12 pb-6 border-t border-slate-200 bg-white pt-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 space-y-2">
          <p className="mb-1 font-black text-slate-900 uppercase tracking-widest text-xs">
            by FMBD CONTROLLER
          </p>
          <div className="text-[11px] font-semibold flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 text-slate-600">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Contact:{" "}
              <strong>Niwat Wiyasing</strong>
            </span>
            <span className="flex items-center gap-1">
              📧 Email:{" "}
              <a
                href="mailto:Niwat_wiy@riverpro.co.th"
                className="text-blue-600 hover:underline"
              >
                Niwat_wiy@riverpro.co.th
              </a>
            </span>
          </div>
          <div className="text-[11px] font-semibold flex justify-center items-center gap-4 text-slate-500">
            <span>
              🟢 Line ID: <strong>niwatwi</strong>
            </span>
            <span>
              📞 Tel: <strong>065-806-4694</strong>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 pt-2 opacity-75">
            © 2026 Riverpro Intertrade Co., Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
