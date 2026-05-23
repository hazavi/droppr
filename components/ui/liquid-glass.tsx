"use client"

import React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlassEffectProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

// ─── SVG Filter (render once at root) ────────────────────────────────────────

export const GlassFilter: React.FC = () => (
  <svg style={{ display: "none" }} aria-hidden="true">
    <filter
      id="glass-distortion"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      filterUnits="objectBoundingBox"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.001 0.005"
        numOctaves="1"
        seed="17"
        result="turbulence"
      />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting
        in="softMap"
        surfaceScale="5"
        specularConstant="1"
        specularExponent="100"
        lightingColor="white"
        result="specLight"
      >
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite
        in="specLight"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="litImage"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="softMap"
        scale="200"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
)

// ─── Core Glass Wrapper ───────────────────────────────────────────────────────

export const GlassEffect: React.FC<GlassEffectProps> = ({
  children,
  className = "",
  style = {},
  onClick,
}) => (
  <div
    className={`relative overflow-hidden cursor-pointer transition-all duration-500 ${className}`}
    style={{
      boxShadow: "0 6px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)",
      transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
      ...style,
    }}
    onClick={onClick}
  >
    {/* Blur + distortion */}
    <div
      className="absolute inset-0 z-0 rounded-[inherit]"
      style={{
        backdropFilter: "blur(16px) saturate(180%)",
        filter: "url(#glass-distortion)",
        isolation: "isolate",
      }}
    />
    {/* Tint */}
    <div
      className="absolute inset-0 z-10 rounded-[inherit]"
      style={{ background: "rgba(255,255,255,0.08)" }}
    />
    {/* Inner bevel highlight */}
    <div
      className="absolute inset-0 z-20 rounded-[inherit]"
      style={{
        boxShadow:
          "inset 1px 1px 0 rgba(255,255,255,0.35), inset -1px -1px 0 rgba(255,255,255,0.12)",
      }}
    />
    {/* Content */}
    <div className="relative z-30">{children}</div>
  </div>
)

// ─── Glass Panel (for cards / modals) ────────────────────────────────────────

export const GlassPanel: React.FC<GlassEffectProps> = ({
  children,
  className = "",
  style,
  onClick,
}) => (
  <GlassEffect
    className={`rounded-2xl ${className}`}
    style={style}
    onClick={onClick}
  >
    {children}
  </GlassEffect>
)
