/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";

interface ProductRow {
  descriptions: string;
  company: string;
  imageurl?: string;
  category?: string;
  brand?: string;
  competitor?: string | null;
  barcode?: string | null;
  is_active?: boolean;
}

interface StoreMasterRow {
  store_name: string;
  store_code: string | null;
  chanel: string | null;
  account: string | null;
  province: string | null;
  region: string | null;
  mer_code: string | null;
  area: string | null;
}

interface OOSItem {
  id: number;
  companyType: string;
  company: string;
  category: string;
  product: string;
  oosReason: string;
  actionPlan: string;
  expectedDate: string;
  priceTagImg: string;
  shelfImg: string;
  cmaImg: string;
}

interface StoreCommentAlert {
  id: number;
  customer_name: string;
  comment_text: string;
  created_at: string;
  status: string;
}

type AuditorType = "CUSTOMER" | "OFFICE" | "KOE" | "MER" | "COMMANDO" | "BA";

function getInitialDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function CompleteRightThemeInputPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [auditorOptions, setAuditorOptions] = useState<string[]>([]);
  const [dbProducts, setDbProducts] = useState<ProductRow[]>([]);
  const [fetchingMaster, setFetchingMaster] = useState<boolean>(true);

  const [areaStoresList, setAreaStoresList] = useState<StoreMasterRow[]>([]);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);

  const [selectedChannel, setSelectedChannel] = useState<string>("MT");
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const [kpiTotalStores, setKpiTotalStores] = useState<number>(0);
  const [kpiTodayReports, setKpiTodayReports] = useState<number>(0);
  const [loadingKpi, setLoadingKpi] = useState<boolean>(false);

  const [dateKey, setDateKey] = useState<string>(getInitialDateString());
  const [selectedAuditorType, setSelectedAuditorType] =
    useState<AuditorType>("MER");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedAuditor, setSelectedAuditor] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("");

  const [activeComments, setActiveComments] = useState<StoreCommentAlert[]>([]);
  const [auditorReplyText, setAuditorReplyText] = useState<{
    [key: number]: string;
  }>({});
  const [isReplying, setIsReplying] = useState<number | null>(null);

  const [items, setItems] = useState<OOSItem[]>([
    {
      id: 1,
      companyType: "",
      company: "",
      category: "",
      product: "",
      oosReason: "ไม่มีสินค้าที่ OOS",
      actionPlan: "",
      expectedDate: "",
      priceTagImg: "",
      shelfImg: "",
      cmaImg: "",
    },
  ]);

  const [loading, setLoading] = useState<boolean>(false);

  // ใน src/app/input/page.tsx
  useEffect(() => {
    const checkAuth = () => {
      const storedUsername = localStorage.getItem("userCode");
      console.log("Debug Auth -> storedUsername:", storedUsername);

      if (!storedUsername) {
        // ถ้าไม่มี userCode ให้ดีดกลับหน้า Login ทันที
        router.push("/login");
        return;
      }

      console.log("Debug Auth -> User found, setting Authorized to true");
      setIsAuthorized(true);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDateTime(
        now.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const checkStoreComments = useCallback(async (storeName: string) => {
    if (!storeName) {
      setActiveComments([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("oos_comments")
        .select("id, customer_name, comment_text, created_at, status")
        .eq("store_name", storeName)
        .eq("status", "pending")
        .order("id", { ascending: false });

      if (!error && data) {
        setActiveComments(data as StoreCommentAlert[]);
      }
    } catch (err) {
      console.error("Comment check error:", err);
    }
  }, []);

  console.log(supabase);

  useEffect(() => {
    if (selectedStore) {
      startTransition(() => {
        checkStoreComments(selectedStore);
      });
    } else {
      startTransition(() => {
        setActiveComments([]);
      });
    }
  }, [selectedStore, checkStoreComments]);

  const handleAuditorReply = async (commentId: number) => {
    const replyText = auditorReplyText[commentId]?.trim();
    if (!replyText) return;

    setIsReplying(commentId);
    try {
      // ✅ บังคับแคสต์ประเภทตัวเชื่อมตารางหลักเพื่อขจัด Type 'never' ของ Supabase
      const { error } = await (supabase.from("oos_comments") as any)
        .update({
          auditor_reply: replyText,
          status: "auditor_replied",
        })
        .eq("id", commentId);

      if (error) throw error;

      setActiveComments((prev) => prev.filter((c) => c.id !== commentId));

      Swal.fire({
        icon: "success",
        title: "บันทึกคำชี้แจงสำเร็จ",
        text: "ข้อความถูกส่งกลับไปที่หน้าจอผู้บริหารและแอดมินแล้วครับพี่!",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsReplying(null);
    }
  };

  const fetchPersonalKPI = useCallback(
    async (auditorCode: string, targetDate: string) => {
      if (!auditorCode || !targetDate) return;
      setLoadingKpi(true);
      try {
        const [storeRes, reportRes] = await Promise.all([
          supabase
            .from("stores")
            .select("*", { count: "exact", head: true })
            .eq("mer_code", auditorCode),
          supabase
            .from("store_visits")
            .select("*", { count: "exact", head: true })
            .eq("auditor", auditorCode)
            .eq("date_key", targetDate),
        ]);

        setKpiTotalStores(storeRes.count || 0);
        setKpiTodayReports(reportRes.count || 0);
      } catch (err) {
        console.error("Error loading KPI details:", err);
      } finally {
        setLoadingKpi(false);
      }
    },
    [],
  );

  const refreshMasterData = useCallback(
    async (currentDateKey: string) => {
      setFetchingMaster(true);
      try {
        const [storesRes, productsRes] = await Promise.all([
          supabase
            .from("stores")
            .select(
              "area, mer_code, store_name, store_code, chanel, account, province, region",
            ),
          supabase
            .from("products")
            .select(
              "descriptions, company, imageurl, category, brand, competitor, barcode",
            )
            .eq("is_active", true),
        ]);

        if (storesRes.data) {
          const storesData = storesRes.data as unknown as StoreMasterRow[]; // ✅ แก้ Property does not exist on type 'never' แบบถูกหลักสากล
          const uniqueAreas = Array.from(
            new Set(storesData.map((s) => s.area).filter(Boolean)),
          );
          setAreaOptions(uniqueAreas.sort() as string[]);

          const uniqueAuditors = Array.from(
            new Set(storesData.map((s) => s.mer_code).filter(Boolean)),
          );
          setAuditorOptions(uniqueAuditors.sort() as string[]);
        }

        if (productsRes.data)
          setDbProducts(productsRes.data as unknown as ProductRow[]);

        if (selectedAuditor) {
          fetchPersonalKPI(selectedAuditor, currentDateKey);
        }
      } catch (err) {
        console.error("Error refreshing master data:", err);
      } finally {
        setFetchingMaster(false);
      }
    },
    [selectedAuditor, fetchPersonalKPI],
  );

  useEffect(() => {
    let isInitialMounted = true;
    const triggerInit = async () => {
      if (isInitialMounted) {
        await refreshMasterData(dateKey);
      }
    };
    triggerInit();
    return () => {
      isInitialMounted = false;
    };
  }, [refreshMasterData, dateKey]);

  useEffect(() => {
    const fetchStoresByArea = async () => {
      if (!selectedArea) {
        setAreaStoresList([]);
        return;
      }
      if (!isAuthorized) return;
      setLoadingStores(true);
      try {
        const { data, error } = await supabase
          .from("stores")
          .select(
            "store_name, store_code, chanel, account, province, region, mer_code, area",
          )
          .eq("area", selectedArea)
          .order("store_name", { ascending: true });

        if (error) throw error;
        if (data) {
          setAreaStoresList(data as unknown as StoreMasterRow[]);
        }
      } catch (err) {
        console.error("Error loading specific stores:", err);
      } finally {
        setLoadingStores(false);
      }
    };
    fetchStoresByArea();
  }, [selectedArea, isAuthorized]);

  const availableChannels = useMemo(() => {
    if (!selectedArea) return [];
    let baseList = areaStoresList;

    if (selectedAuditor) {
      if (selectedAuditor.startsWith("K")) {
        baseList = baseList.filter((s) => s.area === selectedAuditor);
      } else if (selectedAuditor.startsWith("C")) {
        const derivedArea = `K${selectedAuditor.substring(1, 3)}`;
        baseList = baseList.filter((s) => s.area === derivedArea);
      } else if (selectedAuditor.startsWith("M")) {
        baseList = baseList.filter((s) => s.mer_code === selectedAuditor);
      }
    }

    const uniques = new Set(
      baseList.map((s) => s.chanel).filter((c): c is string => !!c),
    );
    return Array.from(uniques).sort();
  }, [areaStoresList, selectedArea, selectedAuditor]);

  const availableAccounts = useMemo(() => {
    if (!selectedArea) return [];
    let baseList = areaStoresList;

    if (selectedAuditor) {
      if (selectedAuditor.startsWith("K")) {
        baseList = baseList.filter((s) => s.area === selectedAuditor);
      } else if (selectedAuditor.startsWith("C")) {
        const derivedArea = `K${selectedAuditor.substring(1, 3)}`;
        baseList = baseList.filter((s) => s.area === derivedArea);
      } else if (selectedAuditor.startsWith("M")) {
        baseList = baseList.filter((s) => s.mer_code === selectedAuditor);
      }
    }

    if (selectedChannel) {
      baseList = baseList.filter((s) => s.chanel === selectedChannel);
    }

    const uniques = new Set(
      baseList.map((s) => s.account).filter((a): a is string => !!a),
    );
    return Array.from(uniques).sort();
  }, [areaStoresList, selectedArea, selectedAuditor, selectedChannel]);

  const finalFilteredStores = useMemo(() => {
    if (!selectedArea) return [];
    let baseList = areaStoresList;

    if (selectedAuditor) {
      if (selectedAuditor.startsWith("K")) {
        baseList = baseList.filter((s) => s.area === selectedAuditor);
      } else if (selectedAuditor.startsWith("C")) {
        const derivedArea = `K${selectedAuditor.substring(1, 3)}`;
        baseList = baseList.filter((s) => s.area === derivedArea);
      } else if (selectedAuditor.startsWith("M")) {
        baseList = baseList.filter((s) => s.mer_code === selectedAuditor);
      }
    }

    if (selectedChannel) {
      baseList = baseList.filter((s) => s.chanel === selectedChannel);
    }
    if (selectedAccount) {
      baseList = baseList.filter((s) => s.account === selectedAccount);
    }

    const uniques = new Set(
      baseList.map((s) => s.store_name).filter((s): s is string => !!s),
    );
    return Array.from(uniques).sort();
  }, [
    areaStoresList,
    selectedArea,
    selectedAuditor,
    selectedChannel,
    selectedAccount,
  ]);

  const companyTypeOptions = ["Company", "Competitor"];

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        companyType: "",
        company: "",
        category: "",
        product: "",
        oosReason: "ไม่มีสินค้าที่ OOS",
        actionPlan: "",
        expectedDate: "",
        priceTagImg: "",
        shelfImg: "",
        cmaImg: "",
      },
    ]);
  };

  const removeItemRow = (id: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemField = (id: number, field: keyof OOSItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleRowImg = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: number,
    field: "priceTagImg" | "shelfImg" | "cmaImg",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateItemField(id, field, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isImageMissing = items.some(
      (item) =>
        item.oosReason !== "ไม่มีสินค้าที่ OOS" &&
        (!item.priceTagImg || !item.shelfImg),
    );

    if (isImageMissing) {
      Swal.fire({
        icon: "warning",
        title: "ถ่ายรูปหลักฐานไม่ครบถ้วน",
        text: "⚠️ มีบางรายการสินค้าขาดที่ยังไม่ได้แนบรูปถ่ายป้ายราคาหรือชั้นวางครับพี่!",
        confirmButtonColor: "#d33",
        confirmButtonText: "ตกลง, จะไปตรวจสอบ",
      });
      setLoading(false);
      return;
    }

    try {
      const matchedStoreData = areaStoresList.find(
        (s) => s.store_name === selectedStore,
      );

      // ✅ บังคับแคสต์ประเภทตัวเชื่อมตารางเพื่อรับข้อมูล visitData.id แบบปลอดภัย ไร้สายแดง 'never' กวนใจ
      const { data: visitData, error: visitError = null } = await (
        supabase.from("store_visits") as any
      )
        .insert([
          {
            date_key: dateKey,
            auditor: selectedAuditor,
            area: selectedArea,
            store_name: selectedStore,
            store_code: matchedStoreData?.store_code || null,
            chanel: matchedStoreData?.chanel || null,
            account: matchedStoreData?.account || null,
            province: matchedStoreData?.province || null,
            region: matchedStoreData?.region || null,
          },
        ])
        .select()
        .single();

      if (visitError) throw visitError;
      if (!visitData) throw new Error("ไม่สามารถสร้างชุดข้อมูลเยือนสาขาได้");

      const itemsToSave = items.map((item) => {
        const masterRow = dbProducts.find(
          (p) => p.descriptions === item.product && p.company === item.company,
        );

        const isNoOos =
          item.oosReason === "none" || item.oosReason === "ไม่มีสินค้าที่ OOS";

        return {
          visit_id: visitData.id,
          company: isNoOos ? "RIVERPRO" : item.company,
          barcode: masterRow?.barcode || null,
          descriptions: isNoOos ? "ไม่มีสินค้าที่ OOS" : item.product,
          oos_reason: item.oosReason,
          category: masterRow?.category || null,
          brand: masterRow?.brand || null,
          product_image_url: masterRow?.imageurl || null,
          price_tag_image: item.priceTagImg || null,
          shelf_image: item.shelfImg || null,
          cma_image: item.cmaImg || null,
          action_plan: item.actionPlan || null,
          expected_delivery_date: item.expectedDate || null,
        };
      });

      // ✅ บังคับแคสต์ท่อส่งข้อมูลไอเทมสินค้าขาด oos_items หนี Type 'never[]' หลุดรอดทุกช่องทางบิวด์
      const { error: itemsError } = await (
        supabase.from("oos_items") as any
      ).insert(itemsToSave);

      if (itemsError) throw itemsError;

      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลเรียบร้อย!",
        text: "🚀 บันทึกหัวข้อการเยี่ยมร้านและรายการสินค้าขาดสำเร็จกริบครับพี่!",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "รับทราบ",
        timer: 3500,
      });

      setItems([
        {
          id: 1,
          companyType: "",
          company: "",
          category: "",
          product: "",
          oosReason: "ไม่มีสินค้าที่ OOS",
          actionPlan: "",
          expectedDate: "",
          priceTagImg: "",
          shelfImg: "",
          cmaImg: "",
        },
      ]);
      fetchPersonalKPI(selectedAuditor, dateKey);
    } catch (err) {
      console.error(err);
      Swal.fire(
        "เกิดข้อผิดพลาด",
        "ไม่สามารถบันทึกข้อมูลสินค้า OOS ได้ในขณะนี้",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans max-w-md mx-auto">
        <div className="text-center py-10 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full m-4">
          <i className="fa-solid fa-circle-notch animate-spin text-blue-600 text-xl mb-2"></i>
          <p className="text-xs font-bold text-slate-500">
            กำลังยืนยันสิทธิ์...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 to-blue-400 font-sans antialiased max-w-md mx-auto relative pb-10">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      <div className="relative bg-white pt-5 pb-4 px-4 rounded-b-[2.5rem] shadow-md border-b border-slate-200">
        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-600 to-teal-400"></div>
        <button
          type="button"
          onClick={() => refreshMasterData(dateKey)}
          className="absolute top-4 right-4 h-7 w-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 shadow-xs"
        >
          <i
            className={`fa-solid fa-rotate ${fetchingMaster ? "animate-spin text-blue-600" : ""}`}
          ></i>
        </button>

        <header className="text-center">
          <img
            src="/rvp.png"
            alt="Riverpro Logo"
            className="h-10 w-auto mx-auto mb-2.5"
          />
          <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase">
            RIVERPRO CENTRAL WAR ROOM
          </h1>
          <div className="mt-2 text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full inline-block border border-blue-100">
            🕒 TIMESTAMP: {currentDateTime || "กำลังโหลด..."}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => router.push("/auditor")}
              className="text-blue-900 font-bold text-xs hover:underline bg-transparent border-0 cursor-pointer"
            >
              ⬅ กลับหน้าพอร์ทัลส่วนตัว (Auditor Hub)
            </button>
          </div>
        </header>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="w-full bg-emerald-600 rounded-2xl shadow-md p-3.5 text-white border-2 border-white relative overflow-hidden">
          <h3 className="text-[11px] font-black tracking-wider uppercase text-white mb-2.5 flex items-center gap-1.5">
            <i className="fa-solid fa-square-poll-vertical"></i>{" "}
            แผงติดตามงานส่วนบุคคล
          </h3>
          {loadingKpi ? (
            <div className="text-center py-4 text-[10px] text-white animate-pulse font-bold">
              🔄 ระบบกำลังคำนวณยอดสะสมรายวัน...
            </div>
          ) : selectedAuditor ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 rounded-xl p-2 text-center border border-white/10">
                <span className="block text-[8px] font-bold text-slate-400 uppercase">
                  ห้างดูแล
                </span>
                <span className="text-lg font-black font-mono">
                  {kpiTotalStores}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2 text-center border border-white/10">
                <span className="block text-[8px] font-bold text-amber-400 uppercase">
                  ส่งวันนี้
                </span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {kpiTodayReports}
                </span>
              </div>
              <div className="bg-teal-500/10 rounded-xl p-2 text-center border border-teal-500/30">
                <span className="block text-[8px] font-bold text-teal-400 uppercase">
                  PROGRESS
                </span>
                <span className="text-lg font-black text-teal-400 font-mono">
                  {kpiTotalStores > 0
                    ? Math.min(
                        Math.round((kpiTodayReports / kpiTotalStores) * 100),
                        100,
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center py-4 text-[10px] text-white font-medium">
              🔒 กรุณาเลือก AUDITOR เพื่อเปิดแผงสถิติ
            </p>
          )}
        </div>

        {fetchingMaster ? (
          <div className="text-center py-10 text-xs font-bold text-blue-600 animate-pulse bg-white rounded-2xl shadow-xs">
            🔄 บูตระบบส่งสัญญาณ...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-200/80 space-y-4">
              <h4 className="text-xs font-black text-slate-800 border-b pb-2 mb-2">
                <i className="fa-solid fa-shop text-blue-600 mr-1"></i>{" "}
                ข้อมูลหัวสาขาหลัก
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-white bg-blue-600 px-3 py-1 rounded-t-lg w-fit shadow-xs">
                    2. DATE KEY
                  </label>
                  <input
                    type="date"
                    value={dateKey}
                    onChange={(e) => setDateKey(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-b-xl rounded-r-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white bg-blue-600 px-3 py-1 rounded-t-lg w-fit shadow-xs">
                    3. AUDITOR TYPE
                  </label>
                  <select
                    value={selectedAuditorType}
                    onChange={(e) =>
                      setSelectedAuditorType(e.target.value as AuditorType)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-b-xl rounded-r-xl text-xs font-bold outline-none bg-slate-50/50"
                  >
                    {["MER", "CUSTOMER", "OFFICE", "KOE", "COMMANDO", "BA"].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-white bg-teal-600 px-3 py-1 rounded-t-lg w-fit shadow-xs">
                    4. AREA
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => {
                      setSelectedArea(e.target.value);
                      setSelectedChannel("");
                      setSelectedAccount("");
                      setSelectedStore("");
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-b-xl rounded-r-xl text-xs font-bold outline-none"
                  >
                    <option value="">-- เลือกเขต --</option>
                    {areaOptions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white bg-teal-600 px-3 py-1 rounded-t-lg w-fit shadow-xs">
                    5. AUDITOR
                  </label>
                  <select
                    value={selectedAuditor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAuditor(val);

                      // 🚀 ย้ายลอจิกถอดรหัสไดนามิกส์มาตรงนี้เพื่อแก้บั๊กเซ็ตสเตทวนลูปใน useEffect ครับพี่นิวาส
                      if (val) {
                        let derivedArea = "";
                        if (val.startsWith("K")) {
                          derivedArea = val;
                        } else if (val.startsWith("C") || val.startsWith("M")) {
                          derivedArea = `K${val.substring(1, 3)}`;
                        }
                        if (derivedArea) {
                          setSelectedArea(derivedArea);
                          setSelectedChannel("");
                          setSelectedAccount("");
                          setSelectedStore("");
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-b-xl rounded-r-xl text-xs font-bold outline-none"
                  >
                    <option value="">-- เลือกรหัส --</option>
                    {auditorOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed border-slate-100">
                <div>
                  <label className="block text-[9px] font-bold text-white bg-cyan-600 px-2 py-0.5 rounded-t-md w-fit">
                    4.1 CHOOSE CHANNEL
                  </label>
                  <select
                    value={selectedChannel}
                    onChange={(e) => {
                      setSelectedChannel(e.target.value);
                      setSelectedAccount("");
                      setSelectedStore("");
                    }}
                    disabled={!selectedArea}
                    className="w-full px-3 py-2 border border-slate-200 rounded-b-xl rounded-r-xl text-xs font-bold outline-none disabled:bg-slate-50"
                  >
                    <option value="">-- เลือก Channel --</option>
                    {availableChannels.map((ch) => (
                      <option key={ch ?? ""} value={ch ?? ""}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-white bg-cyan-600 px-2 py-0.5 rounded-t-md w-fit">
                    4.2 CHOOSE ACCOUNT
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => {
                      setSelectedAccount(e.target.value);
                      setSelectedStore("");
                    }}
                    disabled={!selectedChannel}
                    className="w-full px-3 py-2 border border-slate-200 rounded-b-xl rounded-r-xl text-xs font-bold outline-none disabled:bg-slate-50"
                  >
                    <option value="">-- เลือกห้าง / กลุ่ม --</option>
                    {availableAccounts.map((acc) => (
                      <option key={acc ?? ""} value={acc ?? ""}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 bg-slate-200 px-3 py-1 rounded-t-lg w-fit">
                  6. STORE NAME (ร้านค้าในเงื่อนไขตัวกรอง)
                </label>
                <select
                  required
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-b-xl rounded-r-xl text-xs font-semibold bg-white outline-none"
                >
                  {loadingStores ? (
                    <option value="">🔄 กำลังโหลดรายชื่อร้านค้า...</option>
                  ) : (
                    <>
                      <option value="">
                        {selectedArea
                          ? "-- เลือกร้านค้า --"
                          : "🔒 เลือกเขตพื้นที่ทำงานก่อน"}
                      </option>
                      {finalFilteredStores.map((s) => (
                        <option key={s ?? ""} value={s ?? ""}>
                          {s}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {activeComments.length > 0 && (
              <div className="bg-amber-50 rounded-2xl shadow-sm p-4 border-2 border-amber-200 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                  <i className="fa-solid fa-triangle-exclamation text-amber-600 text-sm"></i>
                  <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-tight">
                    ตรวจพบข้อร้องเรียน/สอบถามจากลูกค้า (Pending Feedback)
                  </h4>
                </div>

                {activeComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                        ด่วน: รอตอบชี้แจง
                      </span>
                      <span className="text-[8px] font-mono font-bold text-slate-400 uppercase">
                        แจ้งโดย: {comment.customer_name}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 leading-relaxed italic text-left">
                      &ldquo; {comment.comment_text} &rdquo;
                    </div>
                    <div className="flex gap-1.5 pt-1.5">
                      <input
                        type="text"
                        placeholder="พิมพ์คำชี้แจงส่งกลับหาลูกค้าที่นี่..."
                        value={auditorReplyText[comment.id] || ""}
                        onChange={(e) =>
                          setAuditorReplyText((prev) => ({
                            ...prev,
                            [comment.id]: e.target.value,
                          }))
                        }
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500 bg-slate-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleAuditorReply(comment.id)}
                        disabled={isReplying === comment.id}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-blue-700 transition-all active:scale-95 cursor-pointer shadow-xs"
                      >
                        {isReplying === comment.id ? (
                          <i className="fa-solid fa-spinner animate-spin"></i>
                        ) : (
                          "ตอบกลับ"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-[9px] text-amber-600 font-bold text-center italic mt-1 animate-pulse">
                  *** กรุณาตอบชี้แจงปัญหาก่อนเริ่มกรอก OOS รายการถัดไปครับ ***
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  <i className="fa-solid fa-boxes-stacked text-blue-900 mr-1"></i>{" "}
                  รายการสถานะชั้นวาง
                </span>
                <span className="block text-[10px] font-bold text-white bg-teal-600 px-3 py-1 rounded-t-lg w-fit shadow-xs">
                  รวม {items.length} รายการ
                </span>
              </div>

              {items.map((item, index) => {
                const rowAvailableCompanies = dbProducts
                  .filter((p) => {
                    if (!item.companyType) return true;
                    return p.competitor === item.companyType;
                  })
                  .map((p) => p.company);
                const uniqueCompanies = Array.from(
                  new Set(rowAvailableCompanies),
                ).sort();

                const rowAvailableCategories = dbProducts
                  .filter((p) => p.company === item.company)
                  .map((p) => p.category);
                const uniqueCategories = Array.from(
                  new Set(rowAvailableCategories),
                )
                  .filter((cat): cat is string => !!cat)
                  .sort();

                const finalRowProducts = dbProducts.filter(
                  (p) =>
                    p.company === item.company && p.category === item.category,
                );

                const matchedProductRow = dbProducts.find(
                  (p) =>
                    p.descriptions === item.product &&
                    p.company === item.company,
                );

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-xs p-4 border-2 border-slate-200 space-y-4 relative pt-6"
                  >
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(item.id)}
                        className="absolute top-3 right-3 text-rose-500 text-xs font-black bg-rose-50 rounded-full h-5 w-5 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                    <div className="absolute top-2 left-3 text-[10px] font-black text-blue-600 font-mono">
                      # ITEM {index + 1}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 mb-1 text-left">
                          ประเภทกลุ่มสินค้า (Company Type)
                        </label>
                        <select
                          value={item.companyType}
                          onChange={(e) => {
                            updateItemField(
                              item.id,
                              "companyType",
                              e.target.value,
                            );
                            updateItemField(item.id, "company", "");
                            updateItemField(item.id, "category", "");
                            updateItemField(item.id, "product", "");
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 bg-white"
                        >
                          <option value="">-- เลือกกลุ่ม --</option>
                          {companyTypeOptions.map((ct) => (
                            <option key={ct} value={ct}>
                              {ct}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 mb-1 text-left">
                          ค่ายสินค้า (Company)
                        </label>
                        <select
                          required
                          disabled={!item.companyType}
                          value={item.company}
                          onChange={(e) => {
                            updateItemField(item.id, "company", e.target.value);
                            updateItemField(item.id, "category", "");
                            updateItemField(item.id, "product", "");
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none bg-slate-50/50"
                        >
                          <option value="">-- เลือกบริษัท --</option>
                          {uniqueCompanies.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1 text-left">
                        หมวดหมู่หลัก (Category)
                      </label>
                      <select
                        disabled={!item.company}
                        value={item.category}
                        onChange={(e) => {
                          updateItemField(item.id, "category", e.target.value);
                          updateItemField(item.id, "product", "");
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white"
                      >
                        <option value="">-- เลือกหมวดหมู่หลัก --</option>
                        {uniqueCategories.map((cat) => (
                          <option key={cat ?? ""} value={cat ?? ""}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1 text-left">
                        สถานะชั้นวาง / เหตุผล
                      </label>
                      <select
                        value={item.oosReason}
                        onChange={(e) =>
                          updateItemField(item.id, "oosReason", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-slate-50/50"
                      >
                        {[
                          "ไม่มีสินค้าที่ OOS",
                          "สินค้าขาดหน้าน้าน มีสต๊อก",
                          "สินค้าขาด ไม่มีออเดอร์",
                          "สินค้าขาด สต๊อกลม",
                          "สินค้าขาด มีออเดอร์",
                          "สินค้าขาดจากโรงงาน",
                          "ไม่มีจำหน่ายในร้านค้า",
                          "สินค้าติดบล็อค (Aging)",
                        ].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {item.oosReason !== "ไม่มีสินค้าที่ OOS" && (
                      <div className="space-y-4 pt-2 border-t border-dashed border-slate-200">
                        <div>
                          <label className="block text-[9px] font-bold text-rose-700 mb-1 text-left">
                            เลือกตัวสินค้าที่ขาด (ตาม Category ที่คัดกรอง)
                          </label>
                          <select
                            required
                            disabled={!item.category}
                            value={item.product}
                            onChange={(e) =>
                              updateItemField(
                                item.id,
                                "product",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none"
                          >
                            <option value="">-- เลือกสินค้าที่ขาด --</option>
                            {finalRowProducts.map((p) => (
                              <option
                                key={p.descriptions ?? ""}
                                value={p.descriptions ?? ""}
                              >
                                {p.brand ? `[${p.brand}] ` : ""}
                                {p.descriptions}
                              </option>
                            ))}
                          </select>
                        </div>

                        {matchedProductRow?.imageurl && (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                            <img
                              src={matchedProductRow.imageurl}
                              alt="Master"
                              className="h-10 w-10 rounded-lg object-cover bg-white border border-slate-100"
                            />
                            <div className="text-left">
                              <p className="text-[9px] font-black text-slate-700">
                                📦 รูปสินค้าหลัก (Master)
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-left">
                            <label className="block text-[8px] font-bold text-rose-800 mb-1">
                              📝 หัวข้อแก้ปัญหา
                            </label>
                            <input
                              type="text"
                              placeholder="วิธีแก้ไข..."
                              value={item.actionPlan}
                              onChange={(e) =>
                                updateItemField(
                                  item.id,
                                  "actionPlan",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                            />
                          </div>
                          <div className="text-left">
                            <label className="block text-[8px] font-bold text-rose-800 mb-1">
                              📅 วันที่ของเข้า
                            </label>
                            <input
                              type="date"
                              value={item.expectedDate}
                              onChange={(e) =>
                                updateItemField(
                                  item.id,
                                  "expectedDate",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-left">
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-bold text-slate-600 block">
                              📸 ป้ายราคา{" "}
                              <span className="text-rose-500">*จำเป็น</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleRowImg(e, item.id, "priceTagImg")
                              }
                              className="w-full text-[8px] file:bg-blue-600 file:text-white file:border-0 file:rounded file:px-1.5 file:py-0.5"
                            />
                            {item.priceTagImg && (
                              <div className="w-full h-20 mt-1 rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
                                <img
                                  src={item.priceTagImg}
                                  alt="Preview Price Tag"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[8px] font-bold text-slate-600 block">
                              📸 ชั้นวาง{" "}
                              <span className="text-rose-500">*จำเป็น</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleRowImg(e, item.id, "shelfImg")
                              }
                              className="w-full text-[8px] file:bg-teal-600 file:text-white file:border-0 file:rounded file:px-1.5 file:py-0.5"
                            />
                            {item.shelfImg && (
                              <div className="w-full h-20 mt-1 rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
                                <img
                                  src={item.shelfImg}
                                  alt="Preview Shelf"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[8px] font-bold text-slate-600 block">
                              📸 CMA{" "}
                              <span className="text-slate-400 font-normal">
                                (ทางเลือก)
                              </span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleRowImg(e, item.id, "cmaImg")
                              }
                              className="w-full text-[8px] file:bg-amber-500 file:text-white file:border-0 file:rounded file:px-1.5 file:py-0.5"
                            />
                            {item.cmaImg && (
                              <div className="w-full h-20 mt-1 rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
                                <img
                                  src={item.cmaImg}
                                  alt="Preview CMA"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addItemRow}
                className="w-full py-2.5 bg-teal-600 border-2 border-white text-white hover:bg-teal-700 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer rounded-xl shadow-sm"
              >
                <i className="fa-solid fa-circle-plus"></i>{" "}
                เพิ่มรายการสินค้าถัดไป
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-black text-white bg-blue-600 border-2 border-yellow-400 hover:bg-blue-700 hover:border-yellow-500 active:scale-[0.99] transition-all shadow-md disabled:bg-slate-400 disabled:border-slate-400 cursor-pointer"
            >
              {loading
                ? "⏳ กำลังประมวลผล..."
                : "📤 ส่งรายงานบันทึกข้อมูลเรียลไทม์"}
            </button>
          </form>
        )}
      </div>

      {/* FOOTER */}
      <footer className="mt-12 mb-8 py-6 px-4 text-center bg-blue-600 text-white border-t-2 border-white rounded-t-3xl shadow-lg">
        <p className="text-[9px] font-black uppercase tracking-widest text-blue-900 mb-3">
          by FMBD CONTROLLER
        </p>
        <div className="space-y-1 mb-4">
          <p className="text-[14px] font-medium text-white-800">
            Niwat Wiyasing
          </p>
          <p className="text-[14px] font-medium text-red-800">
            Niwat_wiy@riverpro.co.th
          </p>
          <div className="flex justify-center gap-4 text-[10px] font-bold mt-2">
            <span className="flex items-center gap-1">
              <i className="fa-brands fa-line text-green-500"></i> niwatwi
            </span>
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-phone text-blue-400"></i> 065-806-4694
            </span>
          </div>
        </div>
        <p className="text-[9px] opacity-50 border-t border-white/5 pt-4 mt-2">
          © 2026 Riverpro Intertrade Co., Ltd.
        </p>
      </footer>
    </div>
  );
}
