/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import Swal from "sweetalert2";

export default function EditOosPage() {
  const router = useRouter();
  const params = useParams(); // ดึง ID จาก URL
  const id = params?.id; // ป้องกัน params เป็น undefined

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      const { data: visit, error } = await supabase
        .from("store_visits")
        .select("*, oos_items(*)")
        .eq("id", id)
        .single();

      if (error || !visit) {
        Swal.fire("ผิดพลาด", "ไม่พบข้อมูลที่ต้องการแก้ไข", "error");
        router.push("/my-history");
        return;
      }

      // เช็ค 15 นาที
      const createdDate = new Date(visit.created_at);
      const now = new Date();
      const diffInMinutes =
        (now.getTime() - createdDate.getTime()) / (1000 * 60);

      if (diffInMinutes > 15) {
        Swal.fire(
          "แจ้งเตือน",
          "รายการนี้เกิน 15 นาทีแล้ว ไม่สามารถแก้ไขได้ครับ",
          "warning",
        );
        router.push("/my-history");
        return;
      }

      setData(visit);
      setLoading(false);
    };

    loadData();
  }, [id, router]);

  const handleUpdate = async () => {
    if (!data) return;
    setLoading(true);

    // ตรงนี้พี่สามารถใส่ Logic .update() ตามที่พี่ต้องการได้เลยครับ
    // เช่น await supabase.from('oos_items').update(...).eq('visit_id', id)

    Swal.fire("สำเร็จ!", "แก้ไขข้อมูลเรียบร้อยแล้ว", "success");
    router.push("/my-history");
    setLoading(false);
  };

  if (loading)
    return (
      <div className="text-center p-10 font-bold text-slate-500 text-xs">
        กำลังโหลดข้อมูล...
      </div>
    );

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-sm font-black mb-4">แก้ไขงาน: {data?.store_name}</h2>
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        {/* พี่เอาฟอร์มของพี่มาใส่ตรงนี้ได้เลย โดยผูกค่ากับ data ที่โหลดมาครับ */}
        <p className="text-xs font-bold mb-4">สถานะร้าน: {data?.store_name}</p>
      </div>
      <button
        onClick={handleUpdate}
        className="w-full bg-blue-600 text-white p-3 rounded-xl mt-4 font-bold text-xs hover:bg-blue-700 transition-all"
      >
        บันทึกการแก้ไข
      </button>
    </div>
  );
}
