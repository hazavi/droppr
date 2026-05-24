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
  <svg className="hidden" aria-hidden="true">
    <defs>
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
    </defs>
  </svg>
)

// ─── Core Glass Wrapper ───────────────────────────────────────────────────────
// Uses three stacked layers: blur+distortion / white tint / highlight edges

export const GlassEffect: React.FC<GlassEffectProps> = ({
  children,
  className = "",
  style = {},
  onClick,
}) => (
  <div
    className={`relative transition-all duration-500 glass-outer-shadow ${className}`}
    style={style}
    onClick={onClick}
  >
    {/* Layer 1 – blur + glass distortion */}
    <div className="absolute inset-0 z-0 overflow-hidden glass-backdrop" />
    {/* Layer 2 – frosted white tint */}
    <div className="absolute inset-0 z-10 bg-white/55 rounded-[inherit]" />
    {/* Layer 3 – highlight edge shine */}
    <div className="absolute inset-0 z-20 glass-shine" />
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
