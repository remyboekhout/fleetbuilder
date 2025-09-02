import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, CalendarDays, Edit3, Truck, Package, Settings2, Share2, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// ---------------------------------------------------------------------------
// Data (updated per requirements)
// ---------------------------------------------------------------------------
const INDUSTRIES = [
  "General Logistics",
  "Retail & E‑commerce",
  "Food & Beverage (Cold Chain)",
  "Construction",
  "Waste & Recycling",
  "Field Services",
  "Other",
];

// Region scope with light pricing factors
const REGIONS = [
  { key: "regional", label: "Regional", factor: 0.99 },
  { key: "national", label: "National", factor: 1.0 },
  { key: "international", label: "International", factor: 1.06 },
];

const GOALS = [
  { key: "downtime", label: "Reduce downtime" },
  { key: "tco", label: "Lower total cost" },
  { key: "scale", label: "Scale up capacity" },
  { key: "peak", label: "Cover seasonal peak" },
  { key: "compliance", label: "Compliance/standards" },
];

// Vehicle taxonomy (trucks, specialized, trailers)
const VEHICLE_TYPES = [
  // Trucks & vans (examples)
  { key: "tractor_4x2",  label: "Tractor Unit 4x2",         icon: <Truck className="h-4 w-4" />, base: 180 },
  { key: "tractor_6x2",  label: "Tractor Unit 6x2",         icon: <Truck className="h-4 w-4" />, base: 195 },
  { key: "rigid",        label: "Rigid Truck",               icon: <Truck className="h-4 w-4" />, base: 150 },
  { key: "van",          label: "Van (L2H2)",                icon: <Truck className="h-4 w-4" />, base: 90  },

  // Specialized vehicles
  { key: "garbage",      label: "Garbage Truck",             icon: <Truck className="h-4 w-4" />, base: 220 },
  { key: "cleaning_cart",label: "Street Cleaning Cart",      icon: <Truck className="h-4 w-4" />, base: 85  },

  // Trailers (use Package icon to avoid CDN issues with a non-existent Trailer icon)
  { key: "box",           label: "Box Trailer",               icon: <Package className="h-4 w-4" />, base: 55  },
  { key: "curtain",       label: "Curtain Sider Trailer",     icon: <Package className="h-4 w-4" />, base: 50  },
  { key: "reefer",        label: "Reefer Trailer",            icon: <Package className="h-4 w-4" />, base: 65  },
  { key: "flatbed",       label: "Flatbed Trailer",           icon: <Package className="h-4 w-4" />, base: 48  },
  { key: "double_decker", label: "Double Decker Trailer",     icon: <Package className="h-4 w-4" />, base: 75  },
  { key: "chassis",       label: "Container Chassis",         icon: <Package className="h-4 w-4" />, base: 45  },
  { key: "kipper",        label: "Kipper Trailer",            icon: <Package className="h-4 w-4" />, base: 80  },
  { key: "tanker",        label: "Tanker Trailer",            icon: <Package className="h-4 w-4" />, base: 95  },
];

// Service / Insurance tiers
const SERVICE_LEVELS = [
  { key: "payg",      label: "Pay as you go",       desc: "Reactive maintenance, parts billed, no SLA",  multiplier: 1.0 },
  { key: "smartcare", label: "SmartCare (limited)", desc: "PM plan + priority line, 24–48h response",    multiplier: 1.1 },
  { key: "totalcare", label: "TotalCare (full)",    desc: "Full service, courtesy vehicle, 8–24h SLA",   multiplier: 1.25 },
];

const INSURANCE = [
  { key: "none",      label: "No insurance",       perDay: 0  },
  { key: "essential", label: "Essential coverage", perDay: 6  },
  { key: "full",      label: "Full coverage",      perDay: 12 },
];

const DELIVERY = [
  { key: "pickup",    label: "Pickup at depot",       perAsset: 0   },
  { key: "delivered", label: "Delivered (standard)",  perAsset: 150 },
  { key: "express",   label: "Express delivery",      perAsset: 300 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const dayMs = 24 * 60 * 60 * 1000;
const clamp = (n, min, max) => Math.min(Math.max(Number.isFinite(n) ? n : 0, min), max);

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const raw = Math.ceil((e - s) / dayMs) + 1; // inclusive
  return Math.max(0, raw);
}

function eur(n) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
}

// Core price calculation (exported for tests)
export function calcPrice({ regionKey, serviceKey, insuranceKey, deliveryKey, vehicles, startDate, endDate }) {
  const region = REGIONS.find(r => r.key === regionKey) || REGIONS[1];
  const service = SERVICE_LEVELS.find(s => s.key === serviceKey) || SERVICE_LEVELS[0];
  const insurance = INSURANCE.find(i => i.key === insuranceKey) || INSURANCE[0];
  const delivery = DELIVERY.find(d => d.key === deliveryKey) || DELIVERY[0];
  const totalDays = daysBetween(startDate, endDate) || 30;

  let rental = 0;
  let insuranceTotal = 0;
  let deliveryTotal = 0;

  const perType = Object.entries(vehicles || {}).map(([key, qty]) => {
    const spec = VEHICLE_TYPES.find(v => v.key === key);
    const q = clamp(parseInt(String(qty), 10), 0, 999999999);
    const base = (spec?.base || 0) * region.factor * service.multiplier;
    const lineRental = base * q * totalDays;
    const lineInsurance = insurance.perDay * q * totalDays;
    const lineDelivery = delivery.perAsset * q;
    rental += lineRental;
    insuranceTotal += lineInsurance;
    deliveryTotal += lineDelivery;
    return { key, label: spec?.label || key, qty: q, base, lineRental, lineInsurance, lineDelivery };
  });

  // Duration-based discount tiers (no minimum rental)
  const durationDiscountRate = totalDays >= 180 ? 0.12 : totalDays >= 90 ? 0.07 : totalDays >= 30 ? 0.03 : 0;

  const subtotal = rental + insuranceTotal + deliveryTotal;
  const discount = subtotal * durationDiscountRate;
  const total = Math.max(0, subtotal - discount);

  return { perType, totalDays, rental, insuranceTotal, deliveryTotal, discount, durationDiscountRate, subtotal, total };
}

// ---------------------------------------------------------------------------
// DEV TESTS – lightweight runtime assertions
// ---------------------------------------------------------------------------
function nearly(a, b, eps = 1e-6) { return Math.abs(a - b) <= eps; }
function runTests() {
  try {
    console.group("FleetBuilder tests");
    // daysBetween
    console.assert(daysBetween("2025-01-01", "2025-01-01") === 1, "daysBetween same day should be 1");
    console.assert(daysBetween("2025-01-01", "2025-01-31") === 31, "daysBetween Jan length");

    // calcPrice simple – no discounts
    const p1 = calcPrice({
      regionKey: "national",
      serviceKey: "payg",
      insuranceKey: "none",
      deliveryKey: "pickup",
      vehicles: { van: 2 },
      startDate: "2025-02-01",
      endDate: "2025-02-10",
    });
    const expected1 = 90 * 2 * 10; // base * qty * days
    console.assert(nearly(p1.total, expected1), `p1 total ${p1.total} != ${expected1}`);

    // calcPrice with duration discount and add-ons
    const p2 = calcPrice({
      regionKey: "international", // 1.06
      serviceKey: "totalcare",    // 1.25
      insuranceKey: "essential",  // €6/day/asset
      deliveryKey: "delivered",   // €150/asset
      vehicles: { box: 1 },        // base 55
      startDate: "2025-03-01",
      endDate: "2025-05-29",      // 90 days inclusive
    });
    const days = 90;
    const base2 = 55 * 1.06 * 1.25; // 72.875
    const rental2 = base2 * 1 * days; // 6558.75
    const insurance2 = 6 * 1 * days;  // 540
    const delivery2 = 150 * 1;        // 150
    const subtotal2 = rental2 + insurance2 + delivery2; // 7248.75 + 0? actually 6558.75+540+150=7248.75
    const discount2 = subtotal2 * 0.07; // 507.4125
    const total2 = subtotal2 - discount2; // 6741.3375
    console.assert(nearly(p2.total, total2), `p2 total ${p2.total} != ${total2}`);

    // multiple vehicles + express delivery
    const p3 = calcPrice({
      regionKey: "regional",
      serviceKey: "smartcare",
      insuranceKey: "full",
      deliveryKey: "express",
      vehicles: { curtain: 3, tanker: 2 },
      startDate: "2025-06-01",
      endDate: "2025-06-30", // 30 days
    });
    console.assert(p3.total > 0 && p3.perType.length === 2, "p3 should have totals and two lines");
    console.groupEnd();
  } catch (err) {
    console.error("Tests failed:", err);
  }
}

// ---------------------------------------------------------------------------
// UI bits
// ---------------------------------------------------------------------------
function StepHeader({ step, total, title, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm text-muted-foreground">Step {step} of {total}</div>
        <h2 className="text-2xl font-semibold mt-1">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="hidden md:flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-2 w-8 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm bg-muted/60 rounded-full px-3 py-1">
      <Badge variant="secondary" className="rounded-full">{label}</Badge>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function FleetBuilder() {
  useEffect(() => { if (typeof window !== "undefined") runTests(); }, []);

  const [step, setStep] = useState(1);
  const totalSteps = 9; // per brief

  // Core answers
  const [fleetSize, setFleetSize] = useState(10);
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [regionKey, setRegionKey] = useState(REGIONS[0].key);
  const [goal, setGoal] = useState(GOALS[0].key);
  const [selectedTypes, setSelectedTypes] = useState(["tractor_4x2", "curtain"]);
  const [quantities, setQuantities] = useState({ tractor_4x2: 5, curtain: 10 });
  const [serviceKey, setServiceKey] = useState("smartcare");
  const [insuranceKey, setInsuranceKey] = useState("essential");
  const [contact, setContact] = useState({ name: "", email: "", phone: "", company: "" });

  // Playground / configurator controls
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [deliveryKey, setDeliveryKey] = useState("delivered");
  const [showTrailerPanel, setShowTrailerPanel] = useState(false);

  // Derived vehicles map = quantities only for selected types
  const vehicles = useMemo(() => {
    const map = {};
    selectedTypes.forEach(k => (map[k] = clamp(quantities[k] || 0, 0, 999999999)));
    return map;
  }, [selectedTypes, quantities]);

  const price = useMemo(() => calcPrice({ regionKey, serviceKey, insuranceKey, deliveryKey, vehicles, startDate, endDate }), [regionKey, serviceKey, insuranceKey, deliveryKey, vehicles, startDate, endDate]);

  function toggleType(key) {
    setSelectedTypes(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  }

  function next() { setStep(s => Math.min(totalSteps + 1, s + 1)); }
  function back() { setStep(s => Math.max(1, s - 1)); }
  function resetAll() {
    setStep(1);
    setFleetSize(10);
    setIndustry(INDUSTRIES[0]);
    setRegionKey(REGIONS[0].key);
    setGoal(GOALS[0].key);
    setSelectedTypes(["tractor_4x2", "curtain"]);
    setQuantities({ tractor_4x2: 5, curtain: 10 });
    setServiceKey("smartcare");
    setInsuranceKey("essential");
    setContact({ name: "", email: "", phone: "", company: "" });
    setDeliveryKey("delivered");
    const d = new Date();
    setStartDate(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 30);
    setEndDate(d.toISOString().slice(0, 10));
  }

  // Simple validators
  const emailOk = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email), [contact.email]);
  const isContactValid = (contact.name?.trim().length > 1) && emailOk;

  // Layout wrapper
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fleet Builder</h1>
          <p className="text-muted-foreground">Answer a few questions to design your ideal fleet. Tweak, compare, and build your own quote—live pricing included.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetAll} className="gap-2"><RefreshCw className="h-4 w-4" />Reset</Button>
          <Button variant="secondary" className="gap-2"><Share2 className="h-4 w-4" />Share</Button>
        </div>
      </div>

      {/* Context bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <SummaryPill label="Region" value={REGIONS.find(r => r.key === regionKey)?.label} />
        <SummaryPill label="Service" value={SERVICE_LEVELS.find(s => s.key === serviceKey)?.label} />
        <SummaryPill label="Insurance" value={INSURANCE.find(i => i.key === insuranceKey)?.label} />
        <SummaryPill label="Duration" value={`${price.totalDays} days`} />
        <SummaryPill label="Assets" value={`${Object.values(vehicles).reduce((a,b)=>a+b,0)} total`} />
        <SummaryPill label="Total" value={eur(price.total)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wizard */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Configure</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={1} total={totalSteps} title="How big is your fleet?" subtitle="Rough estimate is fine—this helps phasing. Longer rentals unlock discounts; no minimum duration." />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label>Number of assets</Label>
                      <Input type="number" min={1} value={fleetSize}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          setFleetSize(Number.isFinite(v) && v >= 1 ? v : 1);
                        }} />
                      <p className="text-xs text-muted-foreground mt-1">No hard limit on fleet size.</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button onClick={next} className="self-end">Continue</Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={2} total={totalSteps} title="Which industry are you operating in?" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label>Industry</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-between md:justify-end">
                      <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" />Back</Button>
                      <Button onClick={next}>Continue</Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={3} total={totalSteps} title="What is your operational region?" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label>Region</Label>
                      <Select value={regionKey} onValueChange={setRegionKey}>
                        <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                        <SelectContent>
                          {REGIONS.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-between md:justify-end">
                      <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" />Back</Button>
                      <Button onClick={next}>Continue</Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={4} total={totalSteps} title="What is the main goal for your fleet?" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {GOALS.map(g => (
                        <button key={g.key} onClick={() => setGoal(g.key)} className={`text-left rounded-2xl border p-3 hover:border-primary transition ${goal === g.key ? "border-primary bg-primary/5" : "border-muted"}`}>
                          <div className="font-medium">{g.label}</div>
                          <div className="text-xs text-muted-foreground">Optimizes suggestions and pricing packages.</div>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-between md:justify-end">
                      <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" />Back</Button>
                      <Button onClick={next}>Continue</Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="s5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={5} total={totalSteps} title="Which vehicle types do you need?" subtitle="Pick multiple. You can set quantities next." />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {VEHICLE_TYPES.map(v => (
                      <button key={v.key} onClick={() => toggleType(v.key)} className={`rounded-2xl border p-3 flex items-start gap-3 hover:border-primary transition ${selectedTypes.includes(v.key) ? "border-primary bg-primary/5" : "border-muted"}`}>
                        <div className="mt-0.5">{v.icon}</div>
                        <div>
                          <div className="font-medium">{v.label}</div>
                          <div className="text-xs text-muted-foreground">From {eur(v.base)}/day</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4" />
                      <button type="button" onClick={() => setShowTrailerPanel(s => !s)} className="underline">View different trailer types</button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" />Back</Button>
                      <Button onClick={next}>Continue</Button>
                    </div>
                  </div>

                  {showTrailerPanel && (
                    <div className="rounded-2xl border p-4">
                      <div className="font-medium mb-2">Trailer catalog</div>
                      <p className="text-sm text-muted-foreground mb-3">Quick reference of common trailers. Select above to include in your build.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {["Box trailer", "Curtain sider", "Reefer", "Flatbed", "Double decker", "Chassis", "Kipper", "Tanker"].map(t => (
                          <div key={t} className="rounded-xl border p-3">
                            <div className="font-medium">{t}</div>
                            <div className="text-xs text-muted-foreground">Specs available on request</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 6 && (
                <motion.div key="s6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={6} total={totalSteps} title="How many of each do you need?" subtitle="Adjust quantities per type." />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTypes.map(k => {
                      const v = VEHICLE_TYPES.find(x => x.key === k);
                      return (
                        <div key={k} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {v?.icon}
                            <div>
                              <div className="font-medium">{v?.label}</div>
                              <div className="text-xs text-muted-foreground">From {eur(v?.base || 0)}/day</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setQuantities(q => ({ ...q, [k]: clamp((q[k] || 0) - 1, 0, 999999999) }))}>-</Button>
                            <Input type="number" value={quantities[k] || 0} min={0} onChange={e => setQuantities(q => ({ ...q, [k]: clamp(parseInt(e.target.value, 10), 0, 999999999) }))} className="w-20 text-center" />
                            <Button variant="outline" onClick={() => setQuantities(q => ({ ...q, [k]: clamp((q[k] || 0) + 1, 0, 999999999) }))}>+</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 justify-between md:justify-end">
                    <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" />Back</Button>
                    <Button onClick={next}>Continue</Button>
                  </div>
                </motion.div>
              )}

              {step === 7 && (
                <motion.div key="s7" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={7} total={totalSteps} title="What is your preferred service level?" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {SERVICE_LEVELS.map(s => (
                      <button key={s.key} onClick={() => setServiceKey(s.key)} className={`text-left rounded-2xl border p-4 hover:border-primary transition ${serviceKey === s.key ? "border-primary bg-primary/5" : "border-muted"}`}>
                        <div className="font-medium">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.desc}</div>
                        <div className="text-xs mt-2">Multiplier: <span className="font-mono">{s.multiplier}x</span></div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-between md:justify-end">
                    <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" />Back</Button>
                    <Button onClick={next}>Continue</Button>
                  </div>
                </motion.div>
              )}

              {step === 8 && (
                <motion.div key="s8" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={8} total={totalSteps} title="What insurance type do you need?" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {INSURANCE.map(i => (
                      <button key={i.key} onClick={() => setInsuranceKey(i.key)} className={`text-left rounded-2xl border p-4 hover:border-primary transition ${insuranceKey === i.key ? "border-primary bg-primary/5" : "border-muted"}`}>
                        <div className="font-medium">{i.label}</div>
                        <div className="text-xs text-muted-foreground">{i.perDay ? `${eur(i.perDay)}/asset/day` : "Custom cover"}</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-between md:justify-end">
                    <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" />Back</Button>
                    <Button onClick={next}>Continue</Button>
                  </div>
                </motion.div>
              )}

              {step === 9 && (
                <motion.div key="s9" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  <StepHeader step={9} total={totalSteps} title="Enter your contact details" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full name</Label>
                      <Input value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} placeholder="Jane Doe" />
                      {!contact.name?.trim() && <p className="text-xs text-red-600 mt-1">Name is required.</p>}
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input value={contact.company} onChange={e => setContact({ ...contact, company: e.target.value })} placeholder="ACME Logistics" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} placeholder="jane@acme.com" />
                      {!emailOk && <p className="text-xs text-red-600 mt-1">Enter a valid email.</p>}
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} placeholder="+31 6 1234 5678" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-between md:justify-end">
                    <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" />Back</Button>
                    <Button onClick={() => setStep(totalSteps + 1)} className="gap-2" disabled={!isContactValid}>Build my quote <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Pricing Playground / Summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Schedule & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div>
                <Label>Delivery</Label>
                <Select value={deliveryKey} onValueChange={setDeliveryKey}>
                  <SelectTrigger><SelectValue placeholder="Select delivery" /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service level</Label>
                <Select value={serviceKey} onValueChange={setServiceKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_LEVELS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Insurance</Label>
                <Select value={insuranceKey} onValueChange={setInsuranceKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURANCE.map(i => <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border p-3 space-y-2">
              <div className="text-sm text-muted-foreground">Per-type breakdown ({price.totalDays} days)</div>
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {price.perType.length === 0 && <div className="text-sm text-muted-foreground">No vehicle types selected yet.</div>}
                {price.perType.map(line => (
                  <div key={line.key} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full px-2 py-0.5 font-mono">x{line.qty}</Badge>
                      <div className="text-sm">{line.label}</div>
                    </div>
                    <div className="text-sm tabular-nums">{eur(line.lineRental + line.lineInsurance + line.lineDelivery)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 text-sm space-y-1">
                <div className="flex justify-between"><span>Rental</span><span className="tabular-nums">{eur(price.rental)}</span></div>
                <div className="flex justify-between"><span>Insurance</span><span className="tabular-nums">{eur(price.insuranceTotal)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span className="tabular-nums">{eur(price.deliveryTotal)}</span></div>
                {price.durationDiscountRate > 0 && (
                  <div className="flex justify-between text-emerald-700"><span>Duration discount ({Math.round(price.durationDiscountRate*100)}%)</span><span className="tabular-nums">−{eur(price.discount)}</span></div>
                )}
                <div className="flex justify-between font-medium text-base"><span>Total</span><span className="tabular-nums">{eur(price.total)}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Prices are indicative and exclude VAT.</div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export PDF</Button>
                <Button className="gap-2"><Check className="h-4 w-4" />Save quote</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Screen */}
      {step > totalSteps && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Edit3 className="h-5 w-5" />Your quote – tweak options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border p-4">
                  <div className="text-sm text-muted-foreground mb-2">Selected types & quantities</div>
                  <div className="space-y-3">
                    {selectedTypes.map(k => {
                      const meta = VEHICLE_TYPES.find(v => v.key === k);
                      return (
                        <div key={k} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">{meta?.icon}<div>{meta?.label}</div></div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setQuantities(q => ({ ...q, [k]: clamp((q[k] || 0) - 1, 0, 999999999) }))}>-</Button>
                            <Input type="number" value={quantities[k] || 0} onChange={e => setQuantities(q => ({ ...q, [k]: clamp(parseInt(e.target.value, 10), 0, 999999999) }))} className="w-20 text-center" />
                            <Button variant="outline" onClick={() => setQuantities(q => ({ ...q, [k]: clamp((q[k] || 0) + 1, 0, 999999999) }))}>+</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border p-4 grid grid-cols-1 gap-3">
                  <div className="text-sm text-muted-foreground">Dates</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Start</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>End</Label>
                      <Input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label>Delivery</Label>
                      <Select value={deliveryKey} onValueChange={setDeliveryKey}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DELIVERY.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Region</Label>
                      <Select value={regionKey} onValueChange={setRegionKey}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REGIONS.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border p-4 grid grid-cols-1 gap-3">
                  <div className="text-sm text-muted-foreground">Service & Insurance</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label>Service level</Label>
                      <Select value={serviceKey} onValueChange={setServiceKey}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SERVICE_LEVELS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Insurance</Label>
                      <Select value={insuranceKey} onValueChange={setInsuranceKey}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INSURANCE.map(i => <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border p-4 grid grid-cols-1 gap-3">
                  <div className="text-sm text-muted-foreground">Contact</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input value={contact.company} onChange={e => setContact({ ...contact, company: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Estimated total</div>
                    <div className="text-3xl font-semibold tabular-nums">{eur(price.total)}</div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    <div>Rental: <span className="tabular-nums">{eur(price.rental)}</span></div>
                    <div>Insurance: <span className="tabular-nums">{eur(price.insuranceTotal)}</span></div>
                    <div>Delivery: <span className="tabular-nums">{eur(price.deliveryTotal)}</span></div>
                    {price.durationDiscountRate > 0 && <div className="text-emerald-700">Discount: −{eur(price.discount)}</div>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full">{REGIONS.find(r => r.key === regionKey)?.label}</Badge>
                  <Badge variant="secondary" className="rounded-full">{SERVICE_LEVELS.find(s => s.key === serviceKey)?.label} service</Badge>
                  <Badge variant="secondary" className="rounded-full">{INSURANCE.find(i => i.key === insuranceKey)?.label} insurance</Badge>
                  <Badge variant="secondary" className="rounded-full">{price.totalDays} days</Badge>
                  <Badge variant="secondary" className="rounded-full">{Object.values(vehicles).reduce((a,b)=>a+b,0)} assets</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="gap-2"><Check className="h-4 w-4" />Save quote</Button>
                  <Button variant="outline" className="gap-2"><Share2 className="h-4 w-4" />Share quote</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>When you save this quote, it appears in <span className="text-foreground font-medium">My Fleet</span> as a draft. You can share it or convert it to a booking later.</p>
              <p>You can always revisit this build, tweak options, or duplicate it for another region or season.</p>
              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-2 text-foreground"><Switch />Receive availability updates by email</label>
                <label className="flex items-center gap-2 text-foreground"><Switch defaultChecked />Lock indicative pricing for 7 days</label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
