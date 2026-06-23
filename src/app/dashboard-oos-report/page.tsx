/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  startTransition,
} from "react";
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Search,
  RefreshCw,
  Home,
  MapPin,
  ShoppingBag,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  ExternalLink,
  Download,
  Printer,
  Share2,
  Send,
  Globe,
  UserCheck,
  FileText,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";
import Swal from "sweetalert2";

interface ReportData {
  id: string;
  created_at: string;
  source_company: string;
  region: string;
  area: string;
  chanel: string;
  account: string;
  store_name: string;
  descriptions: string;
  oos_reason: string;
  action_plan: string | null;
  province: string;
  brand: string;
  category: string;
  price_image_url: string | null;
  shelf_image_url: string | null;
  cma_image_url: string | null;
  auditor: string;
  auditor_type: string;
  visit_id_key: string;
}

interface SupabaseRow {
  id?: string;
  area?: string;
  province?: string;
  store_name?: string;
  date_key?: string;
  company?: string;
  region?: string;
  chanel?: string;
  account?: string;
  descriptions?: string;
  barcode?: string;
  oos_reason?: string;
  action_plan?: string | null;
  price_tag_image?: string | null;
  shelf_image?: string | null;
  cma_image?: string | null;
  auditor?: string;
  auditor_type?: string;
  brand?: string;
  category?: string;
}

interface ComputedMetrics {
  totalAllReasonsCount: number;
  totalOOSAccounts: number;
  totalUniqueVisits: number;
  highestAccount: string;
  lowestAccount: string;
  resolvedStores: number;
  pendingStores: number;
  topOOSItem: string;
  oosRatio: string;
  trendData: any[];
  barChartDataset: any[];
  areaData: any[];
}

interface CommentRow {
  id: number;
  created_at: string;
  store_name: string;
  customer_name: string;
  comment_text: string;
  auditor_reply: string | null;
  admin_reply: string | null;
  status: "pending" | "auditor_replied" | "admin_intervened";
  company: string;
}

const TARGET_OOS_REASONS = [
  "สินค้าขาดหน้าร้าน มีสต๊อก",
  "สินค้าขาด ไม่มีออเดอร์",
  "สินค้าขาด สต๊อกลม",
  "สินค้าขาด มีออเดอร์",
  "ไม่มีสินค้าที่ OOS",
];

const COLORS = ["#2563eb", "#0d9488", "#ea580c", "#84cc16", "#6366f1"];

export default function CompleteWarRoomPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [time, setTime] = useState<string>("");

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentLoading, setCommentLoading] = useState(true);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<number | null>(
    null,
  );
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<
    string | null
  >(null);

  // --- แผง State ฟิลเตอร์หลัก ---
  const [activeCustomerTab, setActiveCustomerTab] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("ALL");
  const [filterRegion, setFilterRegion] = useState<string>("ALL");
  const [filterArea, setFilterArea] = useState<string>("ALL");
  const [filterChanel, setFilterChanel] = useState<string>("ALL"); // 🟢 ปรับตัวแปรสะกดให้ตรงตารางหลังบ้าน
  const [filterAccount, setFilterAccount] = useState<string>("ALL");
  const [filterAuditorType, setFilterAuditorType] = useState<string>("ALL");
  const [filterReason, setFilterReason] = useState<string>("ALL");
  const [filterAuditor, setFilterAuditor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }, 1000);

    const initTimeout = setTimeout(() => {
      startTransition(() => {
        setMounted(true);
        setIsReady(true);
      });
    }, 200);

    return () => {
      clearInterval(timer);
      clearTimeout(initTimeout);
    };
  }, []);

  // ดึงข้อความทวงถามจากบอร์ดผู้บริหาร
  useEffect(() => {
    async function fetchActiveComments() {
      setCommentLoading(true);
      const { data, error } = await supabase
        .from("oos_comments")
        .select("*")
        .neq("status", "admin_intervened")
        .order("id", { ascending: false });

      if (!error && data) setComments(data as CommentRow[]);
      setCommentLoading(false);
    }
    fetchActiveComments();
  }, [refreshTrigger]);

  // ฟังก์ชันโหลดข้อมูลหลักพร้อมระบบกระตุ้น Cache หลังบ้าน
  const loadData = useCallback(async (isRefresh = false) => {
    startTransition(() => {
      setLoading(true);
    });

    try {
      // 🟢 จุดแก้ไขที่ 2: ถ้าเป็นการกดรีเฟรช ให้สั่งยิงกระตุ้นอัปเดตข้อมูลเข้า Cache Table ก่อนเลยครับ
      if (isRefresh) {
        const { error: rpcError } = await supabase.rpc("refresh_warroom_data");
        if (rpcError) console.error("RPC Sync Error:", rpcError);
        setRefreshTrigger((p) => p + 1);
      }

      let allRawData: SupabaseRow[] = [];
      let keepFetching = true;
      let start = 0;
      const step = 1000;

      // 🟢 จุดแก้ไขที่ 3: ปรับแก้เงื่อนไขหลุดลูป ป้องกันอาการ Infinite Loop หน้าเว็บค้าง
      while (keepFetching) {
        const { data, error } = await supabase
          .from("vw_executive_warroom")
          .select(
            "id,created_at,company,region,area,chanel,account,store_name,descriptions,oos_reason,province,auditor,auditor_type,brand,category,price_tag_image,shelf_image,cma_image,date_key,visit_id,barcode",
          )
          .range(start, start + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allRawData = [...allRawData, ...(data as SupabaseRow[])];
          start += step;

          if (data.length < step) {
            keepFetching = false;
          }
        } else {
          keepFetching = false;
        }
      }

      if (allRawData.length > 0) {
        console.log("🔥 พบข้อมูลดิบจำนวน:", allRawData.length);
        const formatted: ReportData[] = allRawData.map((item) => {
          const areaName = item.area || "ไม่ระบุ";
          const provinceName = item.province || "ไม่ระบุ";
          const storeName = item.store_name || "ไม่ระบุ";
          const dateString =
            item.date_key || new Date().toISOString().split("T")[0];

          let derivedRegion = "UPC";
          if (
            areaName.toUpperCase().includes("BKK") ||
            provinceName.includes("กรุงเทพ") ||
            ["นนทบุรี", "ปทุมธานี", "สมุทรปราการ"].some((p) =>
              provinceName.includes(p),
            )
          ) {
            derivedRegion = "BKK";
          }

          return {
            id: item.id || crypto.randomUUID(),
            created_at: dateString,
            source_company: item.company || "ไม่ระบุ", // 🟢 ดึงจากคอลัมน์ 'company'
            region: item.region || "UPC",
            area: areaName,
            chanel: (item.chanel || "MT").toUpperCase(),
            account: item.account || "ไม่ระบุ",
            store_name: storeName,
            descriptions: item.descriptions || item.barcode || "ไม่ระบุ",
            oos_reason: item.oos_reason || "",
            action_plan: null, // 🟢 เนื่องจากไม่มีคอลัมน์ action_plan ใน DB ให้ใส่เป็น null ไว้ก่อนครับ
            province: item.province || "ไม่ระบุ",
            brand: item.brand || "",
            category: item.category || "",
            price_image_url: item.price_tag_image || null,
            shelf_image_url: item.shelf_image || null,
            cma_image_url: item.cma_image || null,
            auditor: item.auditor || "ไม่ระบุ",
            auditor_type: item.auditor_type || "ไม่ระบุ",
            visit_id_key: `${storeName}_${dateString}`,
          };
        });

        startTransition(() => {
          setReports(formatted);
        });
      } else {
        startTransition(() => {
          console.log("❌ ไม่พบข้อมูลเลยจากฐานข้อมูล");
          setReports([]);
        });
      }
    } catch (e) {
      console.error("Fetch error in Central War Room:", e);
    } finally {
      startTransition(() => {
        setLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleAuditorSendReply = async (commentId: number) => {
    const text = replyTexts[commentId]?.trim();
    if (!text) return;

    setSubmittingCommentId(commentId);
    try {
      const { error } = await supabase
        .from("oos_comments")
        .update({
          auditor_reply: text,
          status: "auditor_replied",
        })
        .eq("id", commentId);

      if (error) throw error;

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "ส่งคำชี้แจงเข้าระบบฝั่งผู้บริหารสำเร็จ",
        showConfirmButton: false,
        timer: 2000,
      });

      setReplyTexts((prev) => ({ ...prev, [commentId]: "" }));
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCommentId(null);
    }
  };

  // --- Dropdown Options Memoized ---
  const dateOptions = useMemo(
    () =>
      Array.from(
        new Set(reports.map((r: ReportData) => r.created_at).filter(Boolean)),
      )
        .sort()
        .reverse(),
    [reports],
  );
  const regionOptions = useMemo(() => ["BKK", "UPC"], []);
  const areaOptions = useMemo(
    () =>
      Array.from(
        new Set(reports.map((r: ReportData) => r.area).filter(Boolean)),
      ).sort(),
    [reports],
  );
  const chanelOptions = useMemo(
    () =>
      Array.from(
        new Set(reports.map((r: ReportData) => r.chanel).filter(Boolean)),
      ).sort(),
    [reports],
  );
  const companyOptions = useMemo(
    () =>
      Array.from(
        new Set(
          reports.map((r: ReportData) => r.source_company).filter(Boolean),
        ),
      ).sort(),
    [reports],
  );
  const auditorTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(reports.map((r: ReportData) => r.auditor_type).filter(Boolean)),
      ).sort(),
    [reports],
  );

  const cascadedAccountOptions = useMemo(() => {
    const filteredForOptions = reports.filter((r: ReportData) => {
      if (filterChanel !== "ALL" && r.chanel !== filterChanel) return false;
      if (filterArea !== "ALL" && r.area !== filterArea) return false;
      return true;
    });
    return Array.from(
      new Set(
        filteredForOptions.map((r: ReportData) => r.account).filter(Boolean),
      ),
    ).sort();
  }, [reports, filterChanel, filterArea]);

  const cascadedAuditorOptions = useMemo(() => {
    const filtered = reports.filter((r: ReportData) => {
      if (filterAuditorType !== "ALL" && r.auditor_type !== filterAuditorType)
        return false;
      return true;
    });
    return Array.from(
      new Set(filtered.map((r: ReportData) => r.auditor).filter(Boolean)),
    ).sort();
  }, [reports, filterAuditorType]);

  // --- คัดกรองข้อมูลหลักตามฟิลเตอร์ ---
  const filteredReports = useMemo(() => {
    return reports.filter((r: ReportData) => {
      if (
        activeCustomerTab !== "ALL" &&
        r.source_company.toUpperCase() !== activeCustomerTab.toUpperCase()
      )
        return false;
      if (filterDate !== "ALL" && r.created_at !== filterDate) return false;
      if (filterRegion !== "ALL" && r.region !== filterRegion) return false;
      if (filterArea !== "ALL" && r.area !== filterArea) return false;
      if (filterChanel !== "ALL" && r.chanel !== filterChanel) return false; // 🟢 ปรับตัวแปรสะกด
      if (filterAccount !== "ALL" && r.account !== filterAccount) return false;
      if (filterAuditorType !== "ALL" && r.auditor_type !== filterAuditorType)
        return false;
      if (filterReason !== "ALL" && r.oos_reason !== filterReason) return false;
      if (filterAuditor !== "ALL" && r.auditor !== filterAuditor) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchStore = r.store_name.toLowerCase().includes(query);
        const matchProduct = r.descriptions.toLowerCase().includes(query);
        const matchAccount = r.account.toLowerCase().includes(query);
        if (!matchStore && !matchProduct && !matchAccount) return false;
      }
      return true;
    });
  }, [
    reports,
    activeCustomerTab,
    filterDate,
    filterRegion,
    filterArea,
    filterChanel,
    filterAccount,
    filterAuditorType,
    filterReason,
    filterAuditor,
    searchQuery,
  ]);

  const computedMetrics = useMemo((): ComputedMetrics => {
    const matchedOOS = filteredReports.filter((r: ReportData) =>
      TARGET_OOS_REASONS.includes(r.oos_reason),
    );

    // 🟢 เพิ่ม Log นี้เพื่อดูว่าจริงๆ แล้วมีข้อมูลเข้ามาเท่าไหร่
    console.log("Filtered Reports Length:", filteredReports.length);
    console.log("Matched OOS Length:", matchedOOS.length);

    const uniqueVisitsCount = new Set(
      filteredReports.map((r: ReportData) => r.visit_id_key),
    ).size;

    let customOosRatio = "0.0";
    if (matchedOOS.length > 0) {
      customOosRatio = ((uniqueVisitsCount / matchedOOS.length) * 100).toFixed(
        1,
      );
    }

    const accountCounts: Record<string, number> = {};
    matchedOOS.forEach((r: ReportData) => {
      if (r.account)
        accountCounts[r.account] = (accountCounts[r.account] || 0) + 1;
    });

    const dateMap: Record<string, number> = {};
    filteredReports.forEach((r: ReportData) => {
      const d = r.created_at.substring(5, 10);
      dateMap[d] = (dateMap[d] || 0) + 1;
    });

    const productCounts: Record<string, number> = {};
    matchedOOS.forEach((r: ReportData) => {
      if (r.descriptions)
        productCounts[r.descriptions] =
          (productCounts[r.descriptions] || 0) + 1;
    });

    const sortedProducts = Object.entries(productCounts).sort(
      (a, b) => b[1] - a[1],
    );
    const topOOSProductName = sortedProducts[0]?.[0] || "-";
    const topOOSProductCount = sortedProducts[0]?.[1] || 0;

    return {
      totalAllReasonsCount: filteredReports.length,
      totalOOSAccounts: new Set(matchedOOS.map((r: ReportData) => r.account))
        .size,
      highestAccount:
        Object.entries(accountCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "-",
      lowestAccount:
        Object.entries(accountCounts).sort((a, b) => a[1] - b[1])[0]?.[0] ||
        "-",
      resolvedStores: filteredReports.filter((r: ReportData) => r.action_plan)
        .length,
      pendingStores: filteredReports.filter((r: ReportData) => !r.action_plan)
        .length,
      topOOSItem: `${topOOSProductName} (${topOOSProductCount} ครั้ง)`,
      oosRatio: customOosRatio,
      totalUniqueVisits: uniqueVisitsCount,
      trendData: Object.keys(dateMap)
        .sort()
        .map((k) => ({ date: k, "จำนวน OOS": dateMap[k] })),
      barChartDataset: Object.entries(accountCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, v]) => ({ name, "จำนวน OOS": v })),
      areaData: Array.from(
        new Set(filteredReports.map((r: ReportData) => r.area)),
      )
        .filter(Boolean)
        .map((a) => ({
          name: a,
          value: filteredReports.filter((r: ReportData) => r.area === a).length,
        })),
    };
  }, [filteredReports]);

  const handleExportCSV = useCallback(() => {
    const escapeCsv = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      if (/[,"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };

    const headers = [
      "วันที่",
      "ค่ายสินค้า",
      "ภูมิภาค",
      "เขต",
      "ช่องทาง",
      "ทีมตรวจ",
      "ผู้ตรวจ",
      "เครือข่ายห้าง",
      "ชื่อห้างร้าน/สาขา",
      "รายละเอียดสินค้า",
      "สถานะเหตุผล",
      "แผนแก้ไข",
      "จังหวัด",
      "ลิงก์รูปป้ายราคา",
      "ลิงก์รูปชั้นวาง",
      "ลิงก์รูป CMA",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredReports.map((report: ReportData) =>
        [
          report.created_at,
          report.source_company,
          report.region,
          report.area,
          report.chanel,
          report.auditor_type,
          report.auditor,
          report.account,
          report.store_name,
          report.descriptions,
          report.oos_reason,
          report.action_plan || "",
          report.province,
          report.price_image_url || "",
          report.shelf_image_url || "",
          report.cma_image_url || "",
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oos-warroom-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredReports]);

  const handleShare = useCallback(() => {
    const shareText = `Central War Room Dashboard\nข้อมูล OOS ปัจจุบัน ${filteredReports.length} รายการ\n${window.location.href}`;
    if (navigator.share) {
      navigator
        .share({
          title: "Central War Room",
          text: shareText,
          url: window.location.href,
        })
        .catch(() => null);
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).catch(() => null);
      alert("คัดลอกลิงก์สถิติ OOS สำเร็จแล้วครับพี่!");
    }
  }, [filteredReports]);

  const handleShareLine = useCallback(() => {
    const lineMessage = `Central War Room Dashboard\nข้อมูล OOS ปัจจุบัน ${filteredReports.length} รายการ\n${window.location.href}`;
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(lineMessage)}`;
    window.open(lineUrl, "_blank");
  }, [filteredReports]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-6 font-sans">
      <header className="sticky top-0 z-50 bg-slate-900 px-6 py-4 text-white shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl shadow-inner">
              <img
                src="/rvp.png"
                alt="RVP Logo"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight leading-none">
                Central War Room
              </h1>
              <p className="text-cyan-400 text-xs font-bold tracking-wide mt-0.5">
                FMBD Out of Stock Alert Console
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <p className="text-xl font-mono font-black tracking-wider text-amber-400 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700/60 shadow-inner">
              {mounted ? time : "00:00:00"}
            </p>
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 px-3 py-2 rounded-xl text-xs font-black text-slate-950 shadow-md transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> รีเฟรชข้อมูล
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold rounded-xl shadow-md"
            >
              <Home className="w-3.5 h-3.5" /> หน้าหลัก
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 border-t border-white/10 pt-3 mt-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> พิมพ์รายงาน/PDF
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> แชร์ลิงก์บอร์ด
          </button>
          <button
            onClick={handleShareLine}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" /> ยิงลิงก์เข้า LINE
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        {/* Executive Comments Center */}
        <section className="bg-white border border-red-200/80 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <MessageSquare className="w-4 h-4 text-red-500 animate-bounce" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              ศูนย์รับเรื่องด่วนจากบอร์ดบริหาร (Executive Comments Live)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
            {commentLoading ? (
              <div className="col-span-2 text-center py-4 text-xs font-bold text-slate-400">
                กำลังดึงข้อความร้องเรียนสด...
              </div>
            ) : comments.length === 0 ? (
              <div className="col-span-2 text-center py-6 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                🎉 สัญญาณห้องควบคุมนิ่งดี ไม่มีข้อความทวงถามค้างอยู่ครับ
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-slate-50 border rounded-xl p-3 text-xs space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900 flex items-center gap-1">
                        📍 {comment.store_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-black text-white ${comment.status === "pending" ? "bg-amber-500 animate-pulse" : "bg-blue-600"}`}
                      >
                        {comment.status === "pending"
                          ? "⏳ บอร์ดบริหารทวงถาม"
                          : "🟢 ตอบกลับแล้ว"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                      ค่าย:{" "}
                      <span className="text-blue-600">{comment.company}</span> |
                      โดยคุณ: {comment.customer_name}
                    </div>
                    <p className="bg-white p-2 rounded-lg border border-slate-100 font-semibold mt-2 text-slate-700">
                      {comment.comment_text}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder={
                        comment.auditor_reply
                          ? `เดิม: ${comment.auditor_reply}`
                          : "พิมพ์คำชี้แจงส่งกลับบอร์ดผู้บริหาร..."
                      }
                      value={replyTexts[comment.id] || ""}
                      onChange={(e) =>
                        setReplyTexts({
                          ...replyTexts,
                          [comment.id]: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg p-1.5 text-xs outline-none focus:border-blue-500 bg-white font-medium"
                    />
                    <button
                      onClick={() => handleAuditorSendReply(comment.id)}
                      disabled={
                        submittingCommentId === comment.id ||
                        !replyTexts[comment.id]?.trim()
                      }
                      className="bg-slate-900 text-white font-black px-3 rounded-lg hover:bg-slate-800 text-[11px] shrink-0 disabled:bg-slate-200 shadow-xs"
                    >
                      {submittingCommentId === comment.id
                        ? "ส่ง..."
                        : "ส่งชี้แจง"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* CUSTOMER TABS */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-200/60 rounded-xl max-w-fit shadow-inner">
          <button
            type="button"
            onClick={() => setActiveCustomerTab("ALL")}
            className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${activeCustomerTab === "ALL" ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-300/50"}`}
          >
            All Customers
          </button>
          {companyOptions.map((comp) => (
            <button
              key={comp}
              type="button"
              onClick={() => setActiveCustomerTab(comp)}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all uppercase cursor-pointer ${activeCustomerTab === comp ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-300/50"}`}
            >
              {comp}
            </button>
          ))}
        </div>

        {/* FILTER PANEL */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                แผงควบคุมการกรองคัดแยกรายงาน OOS
              </h4>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="พิมพ์ค้นหาด่วน (ชื่อร้าน / บาร์โค้ด / ห้าง)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">
                <Calendar className="w-3 h-3 inline mr-0.5" /> Date
              </label>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-2 py-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">ทุกวันที่</option>
                {dateOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">
                <Globe className="w-3 h-3 inline mr-0.5" /> Region
              </label>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full px-2 py-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">ทุกภูมิภาค</option>
                {regionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">
                <MapPin className="w-3 h-3 inline mr-0.5" /> Area
              </label>
              <select
                value={filterArea}
                onChange={(e) => {
                  setFilterArea(e.target.value);
                  setFilterAccount("ALL");
                }}
                className="w-full px-2 py-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">ทุกเขตพื้นที่</option>
                {areaOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">
                <TrendingUp className="w-3 h-3 inline mr-0.5" /> Channel
              </label>
              <select
                value={filterChanel}
                onChange={(e) => {
                  setFilterChanel(e.target.value);
                  setFilterAccount("ALL");
                }}
                className="w-full px-2 py-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">ทุกช่องทาง</option>
                {chanelOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">
                <ShoppingBag className="w-3 h-3 inline mr-0.5" /> Account
              </label>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="w-full px-2 py-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">ทุกเครือข่าย</option>
                {cascadedAccountOptions.map((ac) => (
                  <option key={ac} value={ac}>
                    {ac}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">
                <UserCheck className="w-3 h-3 inline mr-0.5" /> Auditor Type
              </label>
              <select
                value={filterAuditorType}
                onChange={(e) => {
                  setFilterAuditorType(e.target.value);
                  setFilterAuditor("ALL");
                }}
                className="w-full px-2 py-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">ทุกทีมตรวจ</option>
                {auditorTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">
                <UserCheck className="w-3 h-3 inline mr-0.5" /> Auditor
              </label>
              <select
                value={filterAuditor}
                onChange={(e) => setFilterAuditor(e.target.value)}
                className="w-full px-2 py-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">รายชื่อผู้ตรวจ</option>
                {cascadedAuditorOptions.map((au) => (
                  <option key={au} value={au}>
                    {au}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">
                <AlertTriangle className="w-3 h-3 inline mr-0.5" /> OOS Reason
              </label>
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="w-full px-2 py-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">ทุกกลุ่มเหตุผล</option>
                {TARGET_OOS_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* KPI CARDS GRID */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3.5">
          <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-sm border border-slate-950 text-center">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider block">
              Total Shortages
            </span>
            <p className="text-2xl font-black font-mono mt-1 text-rose-500">
              {computedMetrics.totalAllReasonsCount}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider block">
              Visit Frequency
            </span>
            <p className="text-xl font-black text-blue-600 font-mono mt-1">
              {computedMetrics.totalUniqueVisits}{" "}
              <span className="text-[10px] font-bold text-slate-400">
                ครั้ง
              </span>
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider block">
              Account OOS
            </span>
            <p className="text-xl font-black text-slate-800 font-mono mt-1">
              {computedMetrics.totalOOSAccounts}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider block">
              Highest Crisis
            </span>
            <p
              className="text-xs font-black text-rose-600 truncate mt-2"
              title={computedMetrics.highestAccount}
            >
              {computedMetrics.highestAccount}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider block">
              Edit completed
            </span>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              {computedMetrics.resolvedStores}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider block">
              Pending
            </span>
            <p className="text-xl font-black text-amber-500 font-mono mt-1">
              {computedMetrics.pendingStores}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 shadow-sm text-center">
            <span className="text-[9px] font-black text-purple-600 tracking-wider block">
              📊 % Accumulated
            </span>
            <p className="text-xl font-black text-purple-700 font-mono mt-1">
              {computedMetrics.oosRatio}%
            </p>
          </div>
          <div className="bg-blue-950 p-4 rounded-2xl shadow-sm text-center text-white border border-blue-900">
            <span className="text-[9px] font-bold text-blue-300 tracking-wider block">
              🔥 Most Absent
            </span>
            <p
              className="text-[10px] font-black truncate mt-2 text-amber-300"
              title={computedMetrics.topOOSItem}
            >
              {computedMetrics.topOOSItem}
            </p>
          </div>
        </section>

        {/* VISUALIZATION CHARTS SECTION */}
        <section className="space-y-6">
          {isReady && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 min-w-0">
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" /> Top 5 Account OOS
                  </h3>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      aspect={1.5}
                    >
                      <BarChart
                        data={computedMetrics.barChartDataset}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                          fontSize={10}
                          fontWeight="bold"
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          fontWeight="bold"
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "11px",
                          }}
                        />
                        <Bar
                          dataKey="จำนวน OOS"
                          name="จำนวน OOS"
                          fill="#2563eb"
                          radius={[6, 6, 0, 0]}
                          barSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Line Chart */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 min-w-0">
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Daily OOS Trend
                  </h3>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      aspect={1.5}
                    >
                      <LineChart
                        data={computedMetrics.trendData}
                        margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={10}
                          fontWeight="bold"
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          fontWeight="bold"
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "11px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="จำนวน OOS"
                          stroke="#ea580c"
                          strokeWidth={3.5}
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Pie/Donut Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Proportion of OOS by Area
                </h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      aspect={1.5}
                    >
                      <PieChart>
                        <Pie
                          data={computedMetrics.areaData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={4}
                        >
                          {computedMetrics.areaData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                    {computedMetrics.areaData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        ></span>
                        <span className="text-[11px] font-extrabold text-slate-600">
                          {item.name} ({item.value} แถว)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Raw Report Record Table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-400" /> Raw report record
              table
            </h3>
            <span className="text-[11px] font-bold bg-cyan-500 text-slate-950 px-2.5 py-0.5 rounded-full font-mono">
              Filtered: {filteredReports.length} Rows
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-slate-100 z-10 text-slate-500 border-b border-slate-200 font-black shadow-xs">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5">Region</th>
                  <th className="p-3.5">Area</th>
                  <th className="p-3.5 text-center">Channel</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Auditor</th>
                  <th className="p-3.5">Account</th>
                  <th className="p-3.5">Store</th>
                  <th className="p-3.5">Descriptions</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Action Plan</th>
                  <th className="p-3.5 text-center">📸 Photo Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="p-12 text-center text-slate-400 italic font-bold"
                    >
                      📭 ไม่พบฐานข้อมูลรายการบันทึก OOS
                      ที่ตรงตามเกณฑ์คัดกรองในรอบนี้ครับ
                    </td>
                  </tr>
                ) : (
                  filteredReports.slice(0, 200).map((report: ReportData) => (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="p-3 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                        {report.created_at}
                      </td>
                      <td className="p-3 uppercase text-blue-600 font-black">
                        {report.source_company}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black ${report.region === "BKK" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}
                        >
                          {report.region}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {report.area}
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-center">
                        {report.chanel}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase">
                          {report.auditor_type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 truncate max-w-[100px]">
                        {report.auditor}
                      </td>
                      <td className="p-3 text-indigo-600 font-black">
                        {report.account}
                      </td>
                      <td className="p-3 text-slate-900 max-w-[140px] truncate">
                        <div className="font-black">{report.store_name}</div>
                        <span className="block text-[8px] font-bold text-slate-400 mt-0.5">
                          📍 จ. {report.province}
                        </span>
                      </td>
                      <td
                        className="p-3 text-slate-600 max-w-[180px] truncate leading-tight font-medium"
                        title={report.descriptions}
                      >
                        {report.descriptions}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black ${TARGET_OOS_REASONS.includes(report.oos_reason) ? "bg-rose-50 text-rose-600 border border-rose-100/70" : "bg-slate-100 text-slate-500"}`}
                        >
                          {report.oos_reason}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 max-w-[140px] truncate italic font-medium">
                        {report.action_plan || "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center items-center gap-1.5">
                          {report.price_image_url ? (
                            <img
                              src={report.price_image_url}
                              alt="Price"
                              onClick={() =>
                                setSelectedPreviewImage(report.price_image_url)
                              }
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200 shadow-xs hover:scale-110 transition-all cursor-pointer"
                              title="คลิกเปิดดูรูปป้ายราคา"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[8px] text-slate-300">
                              No Tag
                            </div>
                          )}

                          {report.shelf_image_url ? (
                            <img
                              src={report.shelf_image_url}
                              alt="Shelf"
                              onClick={() =>
                                setSelectedPreviewImage(report.shelf_image_url)
                              }
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200 shadow-xs hover:scale-110 transition-all cursor-pointer"
                              title="คลิกเปิดดูรูปชั้นวาง"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[8px] text-slate-300">
                              No Shelf
                            </div>
                          )}

                          {report.cma_image_url ? (
                            <img
                              src={report.cma_image_url}
                              alt="CMA"
                              onClick={() =>
                                setSelectedPreviewImage(report.cma_image_url)
                              }
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200 shadow-xs hover:scale-110 transition-all cursor-pointer"
                              title="คลิกเปิดดูรูป CMA"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[8px] text-slate-300">
                              No CMA
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {loading && (
        <p className="text-center py-12 text-xs font-black text-slate-400 animate-pulse tracking-wide">
          🔄 กำลังเชื่อมต่อ API ท่อส่งข้อมูลกลางและประมวลผลการคำนวณ{" "}
          {reports.length} แถว...
        </p>
      )}

      {/* Modal Viewer Popup */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white p-2 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white font-bold w-9 h-9 rounded-full flex items-center justify-center text-sm transition shadow-md z-10 cursor-pointer"
              onClick={() => setSelectedPreviewImage(null)}
            >
              ✕
            </button>
            <img
              src={selectedPreviewImage}
              alt="Warroom Evidence Detail"
              className="max-w-full max-h-[82vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-6 py-3 rounded-xl shadow-md transition-all active:translate-y-0.5 uppercase tracking-wider"
        >
          <Home className="w-4 h-4 text-cyan-400" />{" "}
          กลับสู่หน้าคอนโซลหลักพนักงาน
        </button>
      </div>

      <footer className="max-w-7xl mx-auto mt-12 border-t border-slate-200 bg-white py-6 px-6 rounded-2xl text-center text-[10px] text-slate-400 font-medium space-y-1.5 shadow-sm">
        <p className="font-black text-slate-900 text-xs tracking-widest uppercase">
          by FMBD CONTROLLER
        </p>
        <p className="font-black text-slate-800 text-sm tracking-tight">
          Niwat Wiyasing
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-1 font-bold text-slate-500 pt-0.5 text-[11px]">
          <span className="flex items-center gap-1">
            📧 เมลปฏิบัติงาน:{" "}
            <a
              href="mailto:Niwat_wiy@riverpro.co.th"
              className="text-blue-600 hover:underline"
            >
              Niwat_wiy@riverpro.co.th
            </a>
          </span>
          <span className="flex items-center gap-1">
            🟢 Line ID: <strong>niwatwi</strong>
          </span>
          <span className="flex items-center gap-1">
            📞 Tel: <strong>065-806-4694</strong>
          </span>
        </div>
        <p className="text-[9px] text-slate-400 font-semibold pt-2 opacity-80">
          © 2026 Riverpro Pulp & Paper Co., Ltd. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
