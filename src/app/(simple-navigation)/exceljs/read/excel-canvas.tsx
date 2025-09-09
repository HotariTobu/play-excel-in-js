"use client"

import type {
  Alignment,
  Anchor,
  Border,
  BorderStyle,
  Borders,
  Cell,
  Color,
  Column,
  Font,
  Image,
  ImageRange,
  Row,
  Workbook,
  Worksheet,
} from "exceljs"
import { parse, stringify } from "flatted"
import {
  type CanvasHTMLAttributes,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import { determineImageType } from "@/utils/determine-image-type"
import { sum } from "@/utils/sum"

type FixedImageRange = {
  ext?: {
    width?: number
    height?: number
  }
} & ImageRange

type CanvasBorderStyle = "none" | BorderStyle

type ScaleParams = {
  characterUnit: number
  pixelPerPoint: number
}

type BorderParams = {
  fallbackColor: string
  fallbackStyle: CanvasBorderStyle
  pixelWidthMap: Record<BorderStyle, number>
  pixelSegmentsMap: Record<BorderStyle, number[]>
}

type TextParams = {
  fallbackColor: string
  fallbackFont: {
    familyName: string
    size: number
  }
  fallbackAlignment: CanvasAlignment
  lineHeight: number
}

type DrawingParams = {
  scale: ScaleParams
  border: BorderParams
  text: TextParams

  backgroundColor: string
  fallbackColCharUnitWidth: number
  cellPixelPadding: number
}

type CanvasColumn = {
  number: number
  x: number
  width: number
}

type CanvasRow = {
  number: number
  y: number
  height: number
  getCell: (column: CanvasColumn) => Cell
}

type Pos = {
  x: number
  y: number
}

type Size = {
  width: number
  height: number
}

type Rect = Pos & Size

type CanvasBackground = {
  color: string
}

type CanvasBorder = {
  color: string
  style: CanvasBorderStyle
  width: number
  segments: number[]
}

type CanvasBorders = {
  left: CanvasBorder
  top: CanvasBorder
  right: CanvasBorder
  bottom: CanvasBorder
}

type CanvasAlignment = {
  horizontal: CanvasTextAlign
  vertical: CanvasTextBaseline
  wrapText: boolean
  shrinkToFit: boolean
  indent: number
  textDirection: CanvasDirection
  textRotation: number | "vertical"
}

type CanvasText = {
  color: string
  font: string
  alignment: CanvasAlignment
  lineHeight: number
  value: string
}

type CanvasCell = {
  background: CanvasBackground
  borders: CanvasBorders
  text: CanvasText
} & Rect

type CellNumbers = {
  col: number
  row: number
}

type CellRangeNumbers = {
  start: CellNumbers
  end: CellNumbers
}

type CanvasAnchor = {
  col: number
  row: number
  pixelOffsetX: number
  pixelOffsetY: number
}

type GetRectFromCellNumbers = (cellNumbers: CellNumbers) => Rect | null
type GetRectFromAnchor = (anchor: CanvasAnchor) => Rect | null

type GetRectFromRange = (range: string | FixedImageRange) => Rect | null

type CanvasImage = (
  | {
      type: "buffer"
      data: ArrayBuffer
    }
  | {
      type: "base64"
      data: string
    }
) &
  Rect

const FALLBACK_FONT_FAMILY_MAP: Record<number, string> = {
  1: "serif",
  2: "sans-serif",
  3: "monospace",
} as const

const TEXT_ALIGN_SET = new Set(["left", "right", "center", "start", "end"])
const TEXT_BASELINE_SET = new Set([
  "top",
  "hanging",
  "middle",
  "alphabetic",
  "ideographic",
  "bottom",
])

const EMU_PER_POINT = 12_700
const POINTS_PER_INCH = 72
const IMAGE_RANGE_EXT_DPI = 96

const CELL_REF_REGEX = /^(?<col>[A-Z]{1,3})(?<row>[1-9][0-9]*)$/
const CELL_RANGE_REF_REGEX = /^(?<start>[A-Z]{1,3}[1-9][0-9]*)(?::(?<end>[A-Z]{1,3}[1-9][0-9]*))?$/

const COL_REF_NUM_BASE = "Z".charCodeAt(0) - "A".charCodeAt(0) + 1
const COL_REF_NUM_OFFSET = "A".charCodeAt(0) - 1

const TOKEN_SPLITTER_REGEX = /(?<=\s+|\W)/

const getRectFromPosSize = (posSize: { pos: Pos; size: Size }): Rect => {
  const { pos, size } = posSize
  return {
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height,
  }
}

const getRectFromEdges = (edges: {
  left: number
  top: number
  right: number
  bottom: number
}): Rect => {
  const { left, top, right, bottom } = edges
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

const getPixelWidth = (charUnitWidth: number, params: ScaleParams) => {
  return charUnitWidth * params.characterUnit * params.pixelPerPoint
}

const getPixelHeight = (pointHeight: number, params: ScaleParams) => {
  return pointHeight * params.pixelPerPoint
}

const isVisible = (rowOrColumn: Partial<Row | Column>) => {
  const invisible = rowOrColumn.hidden === true || rowOrColumn.collapsed === true
  return !invisible
}

const getCanvasColumns = (worksheet: Worksheet, params: DrawingParams): CanvasColumn[] => {
  const columnIndices = [...new Array(worksheet.columnCount).keys()]
  const columns = columnIndices.map((index) => worksheet.getColumn(index + 1))

  const defaultColCharUnitWidth =
    worksheet.properties.defaultColWidth ?? params.fallbackColCharUnitWidth

  const getNextX = (canvasColumn: CanvasColumn | undefined) => {
    if (typeof canvasColumn === "undefined") {
      return 0
    }

    return canvasColumn.x + canvasColumn.width
  }

  return columns.reduce<CanvasColumn[]>((result, column) => {
    if (!isVisible(column)) {
      return result
    }

    const lastCanvasColumn = result.at(-1)
    const x = getNextX(lastCanvasColumn)

    const charUnitWidth = column.width ?? defaultColCharUnitWidth
    const width = getPixelWidth(charUnitWidth, params.scale)

    const nextCanvasColumn: CanvasColumn = {
      number: column.number,
      x,
      width,
    }

    return result.concat(nextCanvasColumn)
  }, [])
}

const getCanvasRows = (worksheet: Worksheet, params: DrawingParams): CanvasRow[] | null => {
  const rows = worksheet.getRows(1, worksheet.rowCount)
  if (typeof rows === "undefined") {
    return null
  }

  const defaultRowPointHeight = worksheet.properties.defaultRowHeight

  const getNextY = (canvasRow: CanvasRow | undefined) => {
    if (typeof canvasRow === "undefined") {
      return 0
    }

    return canvasRow.y + canvasRow.height
  }

  return rows.reduce<CanvasRow[]>((result, row) => {
    if (!isVisible(row)) {
      return result
    }

    const lastCanvasRow = result.at(-1)
    const y = getNextY(lastCanvasRow)

    const pointHeight = row.height ?? defaultRowPointHeight
    const height = getPixelHeight(pointHeight, params.scale)

    const nextCanvasRow: CanvasRow = {
      number: row.number,
      y,
      height,
      getCell: (column) => row.getCell(column.number),
    }

    return result.concat(nextCanvasRow)
  }, [])
}

const getCanvasSize = (columns: CanvasColumn[], rows: CanvasRow[]): Size => {
  return {
    width: sum(columns.map((column) => column.width)),
    height: sum(rows.map((row) => row.height)),
  }
}

const getCanvasColor = (color: Partial<Color> | undefined): string | null => {
  if (typeof color === "undefined") {
    return null
  }

  const { argb } = color
  if (typeof argb === "undefined") {
    return null
  }

  const a = argb.substring(0, 2)
  const rgb = argb.substring(2)

  return `#${rgb}${a}`
}

const getCanvasBackground = (cell: Cell, params: DrawingParams): CanvasBackground => {
  const { fill } = cell
  if (typeof fill === "undefined") {
    return {
      color: params.backgroundColor,
    }
  }

  if (fill.type === "pattern") {
    return {
      color: getCanvasColor(fill.bgColor) ?? params.backgroundColor,
    }
  }
  return {
    color: params.backgroundColor,
  }
}

const getCanvasBorder = (
  border: Partial<Border> | undefined,
  params: BorderParams
): CanvasBorder => {
  const color = getCanvasColor(border?.color) ?? params.fallbackColor
  const style = border?.style ?? params.fallbackStyle

  if (style === "none") {
    return {
      color,
      style,
      width: 0,
      segments: [],
    }
  }

  return {
    color,
    style,
    width: params.pixelWidthMap[style],
    segments: params.pixelSegmentsMap[style],
  }
}

const getCanvasBorders = (
  borders: Partial<Borders> | undefined,
  params: BorderParams
): CanvasBorders => {
  return {
    left: getCanvasBorder(borders?.left, params),
    top: getCanvasBorder(borders?.top, params),
    right: getCanvasBorder(borders?.right, params),
    bottom: getCanvasBorder(borders?.bottom, params),
  }
}

const getCanvasFont = (font: Partial<Font> | undefined, params: DrawingParams): string => {
  const italic = font?.italic ?? false
  const bold = font?.bold ?? false
  const size = font?.size ?? params.text.fallbackFont.size
  const name = font?.name ?? params.text.fallbackFont.familyName
  const family = font?.family ?? -1

  const fontStyle = `${italic ? "italic" : ""} ${bold ? "bold" : ""}`
  const fontSize = `${size * params.scale.pixelPerPoint}px`
  const fontFamily = `${name} ${FALLBACK_FONT_FAMILY_MAP[family] ?? ""}`

  return `${fontStyle} ${fontSize} ${fontFamily}`
}

const getCanvasLineHeight = (font: Partial<Font> | undefined, params: DrawingParams) => {
  const fontsize = font?.size ?? params.text.fallbackFont.size
  return fontsize * params.scale.pixelPerPoint * params.text.lineHeight
}

const isTextAlign = (value: string): value is CanvasTextAlign => {
  return TEXT_ALIGN_SET.has(value)
}

const isTextBaseline = (value: string): value is CanvasTextBaseline => {
  return TEXT_BASELINE_SET.has(value)
}

const getCanvasTextAlign = (value: string | undefined): CanvasTextAlign | null => {
  if (typeof value === "undefined") {
    return null
  }

  return isTextAlign(value) ? value : null
}

const getCanvasTextBaseline = (value: string | undefined): CanvasTextBaseline | null => {
  if (typeof value === "undefined") {
    return null
  }

  return isTextBaseline(value) ? value : null
}

const getCanvasAlignment = (
  alignment: Partial<Alignment> | undefined,
  fallbackAlignment: CanvasAlignment
): CanvasAlignment => {
  return {
    ...fallbackAlignment,
    ...alignment,
    horizontal: getCanvasTextAlign(alignment?.horizontal) ?? fallbackAlignment.horizontal,
    vertical: getCanvasTextBaseline(alignment?.vertical) ?? fallbackAlignment.vertical,
  }
}

const getCanvasTextValue = (cell: Cell): string => {
  try {
    return cell.text
  } catch {
    return ""
  }
}

const getCanvasText = (cell: Cell, params: DrawingParams): CanvasText => {
  return {
    color: getCanvasColor(cell.font?.color) ?? params.text.fallbackColor,
    font: getCanvasFont(cell.font, params),
    alignment: getCanvasAlignment(cell.alignment, params.text.fallbackAlignment),
    lineHeight: getCanvasLineHeight(cell.font, params),
    value: getCanvasTextValue(cell),
  }
}

const getCanvasCell = (cell: Cell, rect: Rect, params: DrawingParams): CanvasCell => {
  return {
    background: getCanvasBackground(cell, params),
    borders: getCanvasBorders(cell.border, params.border),
    text: getCanvasText(cell, params),
    ...rect,
  }
}

const getCellNumbersFromCellRef = (cellRef: string): CellNumbers | null => {
  const match = cellRef.match(CELL_REF_REGEX)
  if (match === null) {
    return null
  }

  const { groups } = match
  if (typeof groups === "undefined") {
    return null
  }

  const { col, row } = groups
  if (typeof col === "undefined" || typeof row === "undefined") {
    return null
  }

  const colNumber = Array.from(col).reduce((result, char) => {
    return result * COL_REF_NUM_BASE + (char.charCodeAt(0) - COL_REF_NUM_OFFSET)
  }, 0)

  const rowNumber = Number.parseInt(row, 10)

  return {
    col: colNumber,
    row: rowNumber,
  }
}

const getCellRangeNumbersFromCellRangeRef = (cellRangeRef: string): CellRangeNumbers | null => {
  const match = cellRangeRef.match(CELL_RANGE_REF_REGEX)
  if (match === null) {
    return null
  }

  const { groups } = match
  if (typeof groups === "undefined") {
    return null
  }

  const { start, end } = groups
  if (typeof start === "undefined") {
    return null
  }

  const startNumbers = getCellNumbersFromCellRef(start)
  if (startNumbers === null) {
    return null
  }

  if (typeof end === "undefined") {
    return {
      start: startNumbers,
      end: startNumbers,
    }
  }

  const endNumbers = getCellNumbersFromCellRef(end)
  if (endNumbers === null) {
    return null
  }

  return {
    start: {
      col: Math.min(startNumbers.col, endNumbers.col),
      row: Math.min(startNumbers.row, endNumbers.row),
    },
    end: {
      col: Math.max(startNumbers.col, endNumbers.col),
      row: Math.max(startNumbers.row, endNumbers.row),
    },
  }
}

const getRectFromCellRangeRef = (
  cellRangeRef: string,
  getRect: GetRectFromCellNumbers
): Rect | null => {
  const rangeNumbers = getCellRangeNumbersFromCellRangeRef(cellRangeRef)
  if (rangeNumbers === null) {
    return null
  }

  const startRect = getRect(rangeNumbers.start)
  const endRect = getRect(rangeNumbers.end)
  if (startRect === null || endRect === null) {
    return null
  }

  return getRectFromEdges({
    left: startRect.x,
    top: startRect.y,
    right: endRect.x + endRect.width,
    bottom: endRect.y + endRect.height,
  })
}

const getCanvasTopLeftAnchor = (
  anchor: Partial<Anchor> | undefined,
  params: ScaleParams
): CanvasAnchor | null => {
  const canvasAnchor = getCanvasBottomRightAnchor(anchor, params)
  if (canvasAnchor === null) {
    return null
  }

  canvasAnchor.col += 1
  canvasAnchor.row += 1

  return canvasAnchor
}

const getCanvasBottomRightAnchor = (
  anchor: Partial<Anchor> | undefined,
  params: ScaleParams
): CanvasAnchor | null => {
  if (typeof anchor === "undefined") {
    return null
  }

  const colIndex = anchor.nativeCol ?? anchor.col
  const rowIndex = anchor.nativeRow ?? anchor.row
  if (typeof colIndex === "undefined" || typeof rowIndex === "undefined") {
    return null
  }

  const emuOffsetX = anchor.nativeColOff ?? 0
  const emuOffsetY = anchor.nativeRowOff ?? 0

  const pointOffsetX = emuOffsetX / EMU_PER_POINT
  const pointOffsetY = emuOffsetY / EMU_PER_POINT

  const pixelOffsetX = pointOffsetX * params.pixelPerPoint
  const pixelOffsetY = pointOffsetY * params.pixelPerPoint

  return {
    col: colIndex,
    row: rowIndex,
    pixelOffsetX,
    pixelOffsetY,
  }
}

const getImagePixelSize = (imageRange: FixedImageRange, params: ScaleParams): Size | null => {
  const { ext } = imageRange
  if (typeof ext === "undefined") {
    return null
  }

  const { width, height } = ext
  if (typeof width === "undefined" || typeof height === "undefined") {
    return null
  }

  const pointWidth = (width * POINTS_PER_INCH) / IMAGE_RANGE_EXT_DPI
  const pointHeight = (height * POINTS_PER_INCH) / IMAGE_RANGE_EXT_DPI

  const pixelWidth = pointWidth * params.pixelPerPoint
  const pixelHeight = pointHeight * params.pixelPerPoint

  return { width: pixelWidth, height: pixelHeight }
}

const getRectFromTopLeftBottomRight = (
  topLeftAnchor: CanvasAnchor,
  bottomRightAnchor: CanvasAnchor,
  getRect: GetRectFromAnchor
): Rect | null => {
  const startRect = getRect(topLeftAnchor)
  const endRect = getRect(bottomRightAnchor)
  if (startRect === null || endRect === null) {
    return null
  }

  return getRectFromEdges({
    left: startRect.x,
    top: startRect.y,
    right: endRect.x + endRect.width,
    bottom: endRect.y + endRect.height,
  })
}

const getRectFromTopLeft = (
  topLeftAnchor: CanvasAnchor,
  getRect: GetRectFromAnchor,
  size: Size | null
): Rect | null => {
  const startRect = getRect(topLeftAnchor)
  if (startRect === null) {
    return null
  }

  if (size === null) {
    return startRect
  }

  return getRectFromPosSize({
    pos: startRect,
    size,
  })
}

const getRectFromBottomRight = (
  bottomRightAnchor: CanvasAnchor,
  getRect: GetRectFromAnchor,
  size: Size | null
): Rect | null => {
  const endRect = getRect(bottomRightAnchor)
  if (endRect === null) {
    return null
  }

  if (size === null) {
    return endRect
  }

  return {
    x: endRect.x + endRect.width - size.width,
    y: endRect.y + endRect.height - size.height,
    width: size.width,
    height: size.height,
  }
}

const getRectFromImageRange = (
  imageRange: FixedImageRange,
  getRect: GetRectFromAnchor,
  params: ScaleParams
): Rect | null => {
  const topLeftAnchor = getCanvasTopLeftAnchor(imageRange.tl, params)
  const bottomRightAnchor = getCanvasBottomRightAnchor(imageRange.br, params)

  if (topLeftAnchor !== null && bottomRightAnchor !== null) {
    return getRectFromTopLeftBottomRight(topLeftAnchor, bottomRightAnchor, getRect)
  }

  const imageSize = getImagePixelSize(imageRange, params)

  if (topLeftAnchor !== null) {
    return getRectFromTopLeft(topLeftAnchor, getRect, imageSize)
  }

  if (bottomRightAnchor !== null) {
    return getRectFromBottomRight(bottomRightAnchor, getRect, imageSize)
  }

  return null
}

const createCanvasRangeRectResolver = (
  getRectFromCellNumbers: GetRectFromCellNumbers,
  params: ScaleParams
) => {
  const getRectFromAnchor: GetRectFromAnchor = (anchor) => {
    const rect = getRectFromCellNumbers(anchor)
    if (rect === null) {
      return null
    }

    rect.x += anchor.pixelOffsetX
    rect.y += anchor.pixelOffsetY

    return rect
  }

  const getRectFromRange: GetRectFromRange = (range) => {
    if (typeof range === "string") {
      return getRectFromCellRangeRef(range, getRectFromCellNumbers)
    }

    return getRectFromImageRange(range, getRectFromAnchor, params)
  }

  return {
    getRectFromRange,
  }
}

const safeGetImage = (workbook: Workbook, imageId: string | number): Image | null => {
  const normalizedId = typeof imageId === "string" ? Number.parseInt(imageId, 10) : imageId
  return workbook.getImage(normalizedId) ?? null
}

const getCanvasImage = (rect: Rect, image: Image): CanvasImage | null => {
  if (typeof image.base64 !== "undefined") {
    return {
      type: "base64",
      data: image.base64,
      ...rect,
    }
  }

  if (typeof image.buffer !== "undefined") {
    return {
      type: "buffer",
      data: image.buffer,
      ...rect,
    }
  }

  return null
}

const getCanvasImages = (
  worksheet: Worksheet,
  getRectFromRange: GetRectFromRange
): CanvasImage[] => {
  const canvasImages: CanvasImage[] = []

  for (const { imageId, range } of worksheet.getImages()) {
    const rect = getRectFromRange(range)
    if (rect === null) {
      continue
    }

    const data = safeGetImage(worksheet.workbook, imageId)
    if (data === null) {
      continue
    }

    const canvasImage = getCanvasImage(rect, data)
    if (canvasImage === null) {
      continue
    }

    canvasImages.push(canvasImage)
  }

  return canvasImages
}

const drawCellBackground = (ctx: CanvasRenderingContext2D, cell: CanvasCell) => {
  ctx.fillStyle = cell.background.color
  ctx.fillRect(cell.x, cell.y, cell.width, cell.height)
}

const drawBorder = (
  ctx: CanvasRenderingContext2D,
  border: CanvasBorder,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  if (border.style === "none") {
    return
  }

  ctx.strokeStyle = border.color
  ctx.lineWidth = border.width
  ctx.setLineDash(border.segments)

  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
}

const drawCellBorders = (ctx: CanvasRenderingContext2D, cell: CanvasCell) => {
  ctx.beginPath()

  const left = cell.x
  const top = cell.y
  const right = cell.x + cell.width
  const bottom = cell.y + cell.height

  drawBorder(ctx, cell.borders.left, left, top, left, bottom)
  drawBorder(ctx, cell.borders.top, left, top, right, top)
  drawBorder(ctx, cell.borders.right, right, top, right, bottom)
  drawBorder(ctx, cell.borders.bottom, left, bottom, right, bottom)

  ctx.stroke()
}

const measuringCanvas = document.createElement("canvas")
const measuringCtx = measuringCanvas.getContext("2d")
if (measuringCtx === null) {
  throw new Error("Failed to get measuring canvas context")
}

const measureTextWidth = (font: string, text: string) => {
  measuringCtx.font = font
  return measuringCtx.measureText(text).width
}

const getTextX = (textAlign: CanvasTextAlign, rect: Rect) => {
  switch (textAlign) {
    case "right":
      return rect.x + rect.width
    case "center":
      return rect.x + rect.width / 2
    default:
      return rect.x
  }
}

const getStartTextY = (
  textBaseline: CanvasTextBaseline,
  rect: Rect,
  lineHeight: number,
  linesCount: number
) => {
  const distanceOfTopBottomLines = lineHeight * (linesCount - 1)
  switch (textBaseline) {
    case "middle":
      return rect.y + (rect.height - distanceOfTopBottomLines) / 2
    case "bottom":
      return rect.y + rect.height - distanceOfTopBottomLines
    default:
      return rect.y
  }
}

const getCanvasCellValueLines = (
  value: string,
  wrapText: boolean,
  font: string,
  width: number,
  splitter: string | RegExp = TOKEN_SPLITTER_REGEX
) => {
  const lines = value.split("\n")

  if (!wrapText) {
    return lines
  }

  const wrappedLines = lines.flatMap((line) => {
    const tokens = line.split(splitter)
    const newLines = [""]

    for (const token of tokens) {
      const lastIndex = newLines.length - 1
      const line = newLines[lastIndex] ?? ""
      const newLine = line + token

      const newWidth = measureTextWidth(font, newLine)
      if (newWidth < width) {
        newLines[lastIndex] = newLine
        continue
      }

      if (line === "") {
        const subLines = getCanvasCellValueLines(newLine, wrapText, font, width, "")
        newLines.splice(lastIndex, 1, ...subLines)
      } else {
        newLines.push(token)
      }
    }

    return newLines
  })

  return wrappedLines
}

const drawCellValue = (ctx: CanvasRenderingContext2D, cell: CanvasCell, pixelPadding: number) => {
  ctx.fillStyle = cell.text.color
  ctx.font = cell.text.font
  ctx.textAlign = cell.text.alignment.horizontal
  ctx.textBaseline = cell.text.alignment.vertical
  ctx.direction = cell.text.alignment.textDirection

  const innerRect: Rect = {
    x: cell.x + pixelPadding,
    y: cell.y + pixelPadding,
    width: cell.width - pixelPadding * 2,
    height: cell.height - pixelPadding * 2,
  }

  const lines = getCanvasCellValueLines(
    cell.text.value,
    cell.text.alignment.wrapText,
    cell.text.font,
    innerRect.width
  )

  const textX = getTextX(ctx.textAlign, innerRect)
  const maxWidth = cell.text.alignment.shrinkToFit ? innerRect.width : undefined

  const { lineHeight } = cell.text
  const startTextY = getStartTextY(ctx.textBaseline, innerRect, lineHeight, lines.length)

  lines.reduce((textY, line) => {
    ctx.fillText(line, textX, textY, maxWidth)
    return textY + lineHeight
  }, startTextY)
}

const drawCell = (ctx: CanvasRenderingContext2D, cell: CanvasCell, pixelPadding: number) => {
  drawCellBackground(ctx, cell)
  drawCellBorders(ctx, cell)
  drawCellValue(ctx, cell, pixelPadding)
}

const createImageBitmapFromArrayBuffer = async (
  arrayBuffer: ArrayBuffer
): Promise<ImageBitmap | null> => {
  const imageType = determineImageType(arrayBuffer)
  if (imageType === "unknown") {
    return null
  }

  const mimeType = `image/${imageType}`

  const blob = new Blob([arrayBuffer], { type: mimeType })
  const bitmap = await window.createImageBitmap(blob)
  return bitmap
}

const getArrayBufferFromBase64 = async (base64: string): Promise<ArrayBuffer | null> => {
  // TODO: Use Uint8Array.fromBase64 when available
  try {
    const response = await fetch(`data:application/octet-stream;base64,${base64}`)
    return await response.arrayBuffer()
  } catch {
    return null
  }
}

const drawBase64Image = async (
  ctx: CanvasRenderingContext2D,
  image: CanvasImage & { type: "base64" }
) => {
  const arrayBuffer = await getArrayBufferFromBase64(image.data)
  if (arrayBuffer === null) {
    return
  }

  const bitmap = await createImageBitmapFromArrayBuffer(arrayBuffer)
  if (bitmap === null) {
    return
  }

  ctx.drawImage(bitmap, image.x, image.y, image.width, image.height)
  bitmap.close()
}

const drawBufferImage = async (
  ctx: CanvasRenderingContext2D,
  image: CanvasImage & { type: "buffer" }
) => {
  const bitmap = await createImageBitmapFromArrayBuffer(image.data)
  if (bitmap === null) {
    return
  }

  ctx.drawImage(bitmap, image.x, image.y, image.width, image.height)
  bitmap.close()
}

const drawImage = async (ctx: CanvasRenderingContext2D, image: CanvasImage) => {
  switch (image.type) {
    case "base64":
      await drawBase64Image(ctx, image)
      break
    case "buffer":
      await drawBufferImage(ctx, image)
      break
    default:
      break
  }
}

const doesCellValueFitDrawArea = (cell: CanvasCell) => {
  if (cell.text.alignment.shrinkToFit) {
    return false
  }

  const textWidth = measureTextWidth(cell.text.font, cell.text.value)
  return textWidth < cell.width
}

const createMergedCellResolver = (worksheet: Worksheet) => {
  const range = (a: number, b: number) => {
    return Array.from({ length: b - a + 1 }, (_, i) => a + i)
  }

  type ColNum = number
  type RowNum = number
  type MergeId = number

  const mergeIdMap = new Map<ColNum, Map<RowNum, MergeId>>()
  const rangeNumbersMap = new Map<MergeId, CellRangeNumbers>()

  for (const [mergeId, mergedCellRangeRef] of worksheet.model.merges.entries()) {
    const cellRangeNumbers = getCellRangeNumbersFromCellRangeRef(mergedCellRangeRef)
    if (cellRangeNumbers === null) {
      continue
    }

    const { start, end } = cellRangeNumbers
    for (const col of range(start.col, end.col)) {
      const colMap = new Map<RowNum, MergeId>(
        range(start.row, end.row).map((row) => [row, mergeId])
      )
      mergeIdMap.set(col, colMap)
    }

    rangeNumbersMap.set(mergeId, cellRangeNumbers)
  }

  const getCellRangeNumbers = (cellNumbers: CellNumbers) => {
    const { col, row } = cellNumbers
    const rowMap = mergeIdMap.get(col)
    if (typeof rowMap === "undefined") {
      return null
    }

    const mergeId = rowMap.get(row)
    if (typeof mergeId === "undefined") {
      return null
    }

    return rangeNumbersMap.get(mergeId) ?? null
  }

  const cellRangeNumbersList = Array.from(rangeNumbersMap.values())

  return {
    getCellRangeNumbers,
    cellRangeNumbersList,
  }
}

const createColRowResolver = (columns: CanvasColumn[], rows: CanvasRow[]) => {
  const canvasColumnMap = new Map<number, CanvasColumn>(
    columns.map((column) => [column.number, column])
  )
  const canvasRowMap = new Map<number, CanvasRow>(rows.map((row) => [row.number, row]))

  const getColRow = (cellNumbers: CellNumbers) => {
    const column = canvasColumnMap.get(cellNumbers.col)
    const row = canvasRowMap.get(cellNumbers.row)
    if (typeof column === "undefined" || typeof row === "undefined") {
      return null
    }

    return {
      column,
      row,
    }
  }

  return {
    getColRow,
  }
}

const createCellRectResolver = (
  getColRow: (cellNumbers: CellNumbers) => { column: CanvasColumn; row: CanvasRow } | null
) => {
  const getCellRectOfSingleCell = (cellNumbers: CellNumbers): Rect | null => {
    const colRow = getColRow(cellNumbers)
    if (colRow === null) {
      return null
    }

    const { column, row } = colRow

    return {
      x: column.x,
      y: row.y,
      width: column.width,
      height: row.height,
    }
  }

  const getCellRectOfMergedCell = (cellRangeNumbers: CellRangeNumbers): Rect | null => {
    const startRect = getCellRectOfSingleCell(cellRangeNumbers.start)
    const endRect = getCellRectOfSingleCell(cellRangeNumbers.end)
    if (startRect === null || endRect === null) {
      return null
    }

    return getRectFromEdges({
      left: startRect.x,
      top: startRect.y,
      right: endRect.x + endRect.width,
      bottom: endRect.y + endRect.height,
    })
  }

  return {
    getCellRectOfSingleCell,
    getCellRectOfMergedCell,
  }
}

const iterMergedCells = function* (
  mergedCellRangeNumbersList: CellRangeNumbers[],
  getColRow: (cellNumbers: CellNumbers) => { column: CanvasColumn; row: CanvasRow } | null,
  getCellRectOfMergedCell: (cellRangeNumbers: CellRangeNumbers) => Rect | null,
  params: DrawingParams
) {
  for (const cellRangeNumbers of mergedCellRangeNumbersList) {
    const colRow = getColRow(cellRangeNumbers.start)
    if (colRow === null) {
      continue
    }

    const { column, row } = colRow
    const cell = row.getCell(column)

    const rect = getCellRectOfMergedCell(cellRangeNumbers)
    if (rect === null) {
      continue
    }

    yield getCanvasCell(cell, rect, params)
  }
}

const iterCellsInRowExcludeMerged = function* (
  row: CanvasRow,
  columns: CanvasColumn[],
  params: DrawingParams
) {
  for (const column of columns) {
    const cell = row.getCell(column)
    if (cell.isMerged) {
      continue
    }

    const rect: Rect = {
      x: column.x,
      y: row.y,
      width: column.width,
      height: row.height,
    }

    yield getCanvasCell(cell, rect, params)
  }
}

// FIXME: This order displays cell values incorrectly. Sometimes, values from overflowing cells spill over into blank cells. To fix this, check the surrounding cells and clip the values as needed.
const iterCellsInDrawOrder = function* (cells: Iterable<CanvasCell>) {
  const nonEmptyCells: CanvasCell[] = []

  for (const cell of cells) {
    if (cell.text.value.length > 0) {
      nonEmptyCells.push(cell)
      continue
    }

    yield cell
  }

  const fitCells: CanvasCell[] = []

  for (const cell of nonEmptyCells) {
    if (doesCellValueFitDrawArea(cell)) {
      fitCells.push(cell)
      continue
    }

    yield cell
  }

  yield* fitCells
}

const createSheetDataProvider = (worksheet: Worksheet, params: DrawingParams) => {
  const canvasColumns = getCanvasColumns(worksheet, params)
  const canvasRows = getCanvasRows(worksheet, params)
  if (canvasRows === null) {
    return null
  }

  const canvasSize = getCanvasSize(canvasColumns, canvasRows)

  const { getCellRangeNumbers, cellRangeNumbersList } = createMergedCellResolver(worksheet)
  const { getColRow } = createColRowResolver(canvasColumns, canvasRows)
  const { getCellRectOfSingleCell, getCellRectOfMergedCell } = createCellRectResolver(getColRow)

  const getCellRect = (cellNumbers: CellNumbers) => {
    const cellRangeNumbers = getCellRangeNumbers(cellNumbers)
    if (cellRangeNumbers === null) {
      return getCellRectOfSingleCell(cellNumbers)
    }

    return getCellRectOfMergedCell(cellRangeNumbers)
  }

  const iterCells = function* () {
    const mergedCells = iterMergedCells(
      cellRangeNumbersList,
      getColRow,
      getCellRectOfMergedCell,
      params
    )
    yield* iterCellsInDrawOrder(mergedCells)

    for (const row of canvasRows) {
      const cellsInRow = iterCellsInRowExcludeMerged(row, canvasColumns, params)
      yield* iterCellsInDrawOrder(cellsInRow)
    }
  }

  return {
    canvasSize,
    getCellRect,
    iterCells,
  }
}

const drawSheet = async (
  canvas: HTMLCanvasElement,
  worksheet: Worksheet,
  params: DrawingParams
) => {
  const dataProvider = createSheetDataProvider(worksheet, params)
  if (dataProvider === null) {
    return
  }

  const { canvasSize, getCellRect, iterCells } = dataProvider

  canvas.width = canvasSize.width
  canvas.height = canvasSize.height

  const ctx = canvas.getContext("2d")
  if (ctx === null) {
    return
  }

  ctx.fillStyle = params.backgroundColor
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

  ctx.lineCap = "square"
  ctx.lineJoin = "miter"

  for (const cell of iterCells()) {
    drawCell(ctx, cell, params.cellPixelPadding)
  }

  const { getRectFromRange } = createCanvasRangeRectResolver(getCellRect, params.scale)
  const images = getCanvasImages(worksheet, getRectFromRange)

  const promises = images.map((image) => drawImage(ctx, image))
  await Promise.all(promises)
}

type ExcelCanvasOptions = {
  characterUnit: number
  dpi: number

  borderFallbackColor: string
  borderFallbackStyle: CanvasBorderStyle
  borderPointWidthMap: Record<BorderStyle, number>
  borderPointSegmentsMap: Partial<Record<BorderStyle, number[]>>

  textFallbackColor: string
  textFallbackFontFamilyName: string
  textFallbackFontSize: number
  textFallbackAlignmentHorizontal: CanvasTextAlign
  textFallbackAlignmentVertical: CanvasTextBaseline
  textFallbackAlignmentWrapText: boolean
  textFallbackAlignmentShrinkToFit: boolean
  textFallbackAlignmentIndent: number
  textFallbackAlignmentTextDirection: CanvasDirection
  textFallbackAlignmentTextRotation: number | "vertical"
  textLineHeight: number

  backgroundColor: string
  fallbackColCharUnitWidth: number
  cellPointPadding: number
}

const defaultOptions: ExcelCanvasOptions = {
  characterUnit: 5.85,
  dpi: 192,

  borderFallbackColor: "lightgray",
  borderFallbackStyle: "none",
  borderPointWidthMap: {
    hair: 0.2,
    thin: 0.8,
    double: 0.5,
    dotted: 0.8,
    dashed: 0.8,
    dashDot: 0.8,
    dashDotDot: 0.8,
    medium: 1.5,
    mediumDashDot: 1.5,
    mediumDashDotDot: 1.5,
    mediumDashed: 1.5,
    slantDashDot: 1.5,
    thick: 2,
  },
  borderPointSegmentsMap: {
    // biome-ignore-start lint/style/noMagicNumbers: Line dash segment numbers
    dashDot: [4, 2, 2, 2],
    dashDotDot: [4, 2, 2, 2, 2, 2],
    dashed: [4],
    dotted: [2],
    mediumDashDot: [4, 2, 2, 2],
    mediumDashDotDot: [4, 2, 2, 2, 2, 2],
    mediumDashed: [4],
    slantDashDot: [4, 2, 2, 2],
    // biome-ignore-end lint/style/noMagicNumbers: Line dash segment numbers
  },

  textFallbackColor: "black",
  textFallbackFontFamilyName: "Arial",
  textFallbackFontSize: 10,
  textFallbackAlignmentHorizontal: "left",
  textFallbackAlignmentVertical: "bottom",
  textFallbackAlignmentWrapText: false,
  textFallbackAlignmentShrinkToFit: false,
  textFallbackAlignmentIndent: 0,
  textFallbackAlignmentTextDirection: "inherit",
  textFallbackAlignmentTextRotation: 0,
  textLineHeight: 1.2,

  backgroundColor: "white",
  fallbackColCharUnitWidth: 13,
  cellPointPadding: 2,
}

const mapBorderStyleRecord = <V, R>(
  record: Partial<Record<BorderStyle, V>>,
  mapper: (value: V | undefined) => R
): Record<BorderStyle, R> => {
  return {
    hair: mapper(record.hair),
    thin: mapper(record.thin),
    double: mapper(record.double),
    dotted: mapper(record.dotted),
    dashed: mapper(record.dashed),
    dashDot: mapper(record.dashDot),
    dashDotDot: mapper(record.dashDotDot),
    medium: mapper(record.medium),
    mediumDashDot: mapper(record.mediumDashDot),
    mediumDashDotDot: mapper(record.mediumDashDotDot),
    mediumDashed: mapper(record.mediumDashed),
    slantDashDot: mapper(record.slantDashDot),
    thick: mapper(record.thick),
  }
}

const getDrawingParams = (options: ExcelCanvasOptions) => {
  const pixelPerPoint = options.dpi / POINTS_PER_INCH

  return {
    scale: {
      characterUnit: options.characterUnit,
      pixelPerPoint,
    },

    border: {
      fallbackColor: options.borderFallbackColor,
      fallbackStyle: options.borderFallbackStyle,
      pixelWidthMap: mapBorderStyleRecord(
        options.borderPointWidthMap,
        (pointWidth) => (pointWidth ?? 0) * pixelPerPoint
      ),
      pixelSegmentsMap: mapBorderStyleRecord(
        options.borderPointSegmentsMap,
        (pointSegments) => pointSegments?.map((pointSegment) => pointSegment * pixelPerPoint) ?? []
      ),
    },
    text: {
      fallbackColor: options.textFallbackColor,
      fallbackFont: {
        familyName: options.textFallbackFontFamilyName,
        size: options.textFallbackFontSize,
      },
      fallbackAlignment: {
        horizontal: options.textFallbackAlignmentHorizontal,
        vertical: options.textFallbackAlignmentVertical,
        wrapText: options.textFallbackAlignmentWrapText,
        shrinkToFit: options.textFallbackAlignmentShrinkToFit,
        indent: options.textFallbackAlignmentIndent,
        textDirection: options.textFallbackAlignmentTextDirection,
        textRotation: options.textFallbackAlignmentTextRotation,
      },
      lineHeight: options.textLineHeight,
    },

    backgroundColor: options.backgroundColor,
    fallbackColCharUnitWidth: options.fallbackColCharUnitWidth,
    cellPixelPadding: options.cellPointPadding * pixelPerPoint,
  } satisfies DrawingParams
}

type ExcelCanvasProps = {
  workbook: Workbook
  sheet?: number | string | undefined
  options?: Partial<ExcelCanvasOptions>
  scale?: number
} & CanvasHTMLAttributes<HTMLCanvasElement>

export const ExcelCanvas = forwardRef<HTMLCanvasElement, ExcelCanvasProps>(
  ({ workbook, sheet, options, scale, ...props }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useImperativeHandle<HTMLCanvasElement | null, HTMLCanvasElement | null>(
      ref,
      () => canvasRef.current
    )

    const optionsString = stringify(options)

    useEffect(() => {
      const canvas = canvasRef.current
      if (canvas === null) {
        return
      }

      const worksheet = workbook.getWorksheet(sheet)
      if (typeof worksheet === "undefined") {
        return
      }

      const options: ExcelCanvasOptions = {
        ...defaultOptions,
        ...parse(optionsString),
      }

      const drawingParams = getDrawingParams(options)

      drawSheet(canvas, worksheet, drawingParams)

      if (typeof scale === "undefined") {
        canvas.style.removeProperty("width")
        canvas.style.removeProperty("height")
        return
      }

      canvas.style.width = `${canvas.width * scale}px`
      canvas.style.height = `${canvas.height * scale}px`
    }, [workbook, sheet, optionsString, scale])

    return <canvas ref={canvasRef} {...props} />
  }
)
