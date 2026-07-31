import cryolipolysisImage from "@/assets/alsma/cryolipolysis-new.webp";
import massageChairImage from "@/assets/alsma/massage-chair-new.webp";
import nugaBedImage from "@/assets/alsma/nuga-bed-new.webp";
import pressotherapyImage from "@/assets/alsma/pressotherapy-new.webp";
import quantumBedImage from "@/assets/alsma/quantum-bed-new.png";

export const HARDWARE_PROCEDURES = [
  {
    accent: "Восстановление без контакта",
    description:
      "Оздоровление организма при помощи электромагнитных волн без физического контакта с кожей. Применяется в физиотерапии, реабилитации и профилактике.",
    duration: "10 минут",
    image: quantumBedImage,
    price: "1 000 ₽",
    title: "Квантовая кровать",
  },
  {
    accent: "Экспресс-релакс",
    description:
      "Быстрый расслабляющий сеанс для снятия напряжения в спине, плечах и шее между активностями и SPA-ритуалами.",
    duration: "10 минут",
    image: massageChairImage,
    price: "300 ₽",
    title: "Массажное кресло",
  },
  {
    accent: "Комплексное восстановление",
    description:
      "Вытяжение позвоночника, инфракрасное прогревание, точечный массаж, миостимуляция, ионизация и термотерапия.",
    duration: "40 минут",
    image: nugaBedImage,
    price: "800 ₽",
    title: "Кровать Нуга-Бест",
  },
  {
    accent: "Лимфодренаж и лёгкость",
    description:
      "Аппаратный массаж сжатым воздухом стимулирует отток лимфы, улучшает микроциркуляцию и помогает вывести лишнюю жидкость.",
    duration: "20 минут",
    image: pressotherapyImage,
    price: "1 200 ₽",
    title: "Прессотерапия",
  },
  {
    accent: "Коррекция локальных зон",
    description:
      "Неинвазивная коррекция локальных жировых отложений направленным холодом без операции и повреждения кожи.",
    duration: "1 зона",
    image: cryolipolysisImage,
    price: "3 200 ₽",
    title: "Криолиполиз",
  },
] as const;
