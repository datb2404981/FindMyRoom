<script setup>
import Icon from './Icon.vue'
defineProps({
  label: { default: 'Đại học Cần Thơ' },
  address: { default: 'Ninh Kiều, Cần Thơ' }
})
</script>

<template>
  <div class="map-panel" role="img" :aria-label="'Sơ đồ vị trí: ' + address">
    <!-- Nền lưới bản đồ hiện đại phong cách Apple/Google Maps tối giản -->
    <div class="map-grid-bg"></div>
    <div class="map-water-area"></div>
    <div class="map-park-area"></div>
    
    <!-- Các tuyến đường chính -->
    <div class="map-road road-horizontal">
      <span class="road-name">Đường 3 tháng 2</span>
    </div>
    <div class="map-road road-diagonal">
      <span class="road-name">Nguyễn Văn Cừ</span>
    </div>
    <div class="map-road road-secondary"></div>

    <!-- Điểm ghim vị trí thẩm mỹ cao -->
    <div class="map-pin-container">
      <div class="pin-pulse"></div>
      <div class="pin-marker">
        <Icon name="pin" :size="20" />
      </div>
      <div class="pin-tooltip">
        <span class="tooltip-dot"></span>
        <strong class="tooltip-text">{{ label }}</strong>
      </div>
    </div>

    <!-- Badge chỉ dẫn quận/thành phố tinh tế góc dưới -->
    <div class="map-city-tag">
      <Icon name="map" :size="13" />
      <span>Cần Thơ</span>
    </div>
  </div>
</template>

<style scoped>
.map-panel {
  height: 280px;
  position: relative;
  overflow: hidden;
  background: #f4efe6;
  border: 1px solid var(--line, rgba(19, 20, 20, 0.12));
  border-radius: 16px;
  isolation: isolate;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.02);
}

.map-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(19, 20, 20, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(19, 20, 20, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  z-index: 1;
}

.map-water-area {
  position: absolute;
  right: -30px;
  top: -40px;
  width: 130px;
  height: 380px;
  background: #c3e2e6;
  border-left: 2px solid #a8d5db;
  transform: rotate(-18deg);
  border-radius: 40px;
  z-index: 2;
  opacity: 0.85;
}

.map-park-area {
  position: absolute;
  top: 24px;
  left: 20px;
  width: 90px;
  height: 64px;
  border-radius: 14px;
  background: #d6e5c9;
  border: 1px solid #c2d6b3;
  z-index: 2;
  opacity: 0.9;
}

.map-road {
  position: absolute;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  z-index: 3;
}

.road-horizontal {
  left: -20%;
  top: 54%;
  width: 140%;
  height: 26px;
  transform: rotate(-14deg);
  display: flex;
  align-items: center;
  padding-left: 35%;
  border-top: 1px solid #e2ddd3;
  border-bottom: 1px solid #e2ddd3;
}

.road-diagonal {
  left: 10%;
  top: -20%;
  width: 120%;
  height: 24px;
  transform: rotate(56deg);
  display: flex;
  align-items: center;
  padding-left: 30%;
  border-top: 1px solid #e2ddd3;
  border-bottom: 1px solid #e2ddd3;
}

.road-secondary {
  left: -10%;
  top: 18%;
  width: 120%;
  height: 14px;
  transform: rotate(-8deg);
  border-top: 1px dashed #d8d2c4;
  border-bottom: 1px dashed #d8d2c4;
  opacity: 0.8;
}

.road-name {
  font-size: 10px;
  font-weight: 500;
  color: #7b8377;
  letter-spacing: 0.03em;
  white-space: nowrap;
  user-select: none;
}

.map-pin-container {
  position: absolute;
  left: 50%;
  top: 48%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.pin-pulse {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(239, 90, 60, 0.25);
  animation: pinPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  top: -2px;
}

.pin-marker {
  width: 32px;
  height: 32px;
  background: #e63946;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(230, 57, 70, 0.4);
  border: 2px solid #ffffff;
  position: relative;
}

.pin-marker :deep(svg) {
  transform: rotate(45deg);
  fill: #ffffff;
  color: #ffffff;
}

.pin-tooltip {
  margin-top: 6px;
  background: #ffffff;
  color: #131414;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(19, 20, 20, 0.12);
  border: 1px solid rgba(19, 20, 20, 0.08);
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
}

.tooltip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e63946;
  flex-shrink: 0;
}

.tooltip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-city-tag {
  position: absolute;
  bottom: 10px;
  left: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  padding: 4px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #3b4946;
  display: flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  z-index: 5;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

@keyframes pinPulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}
</style>
