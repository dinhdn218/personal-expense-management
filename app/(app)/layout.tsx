import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileTabbar } from '@/components/layout/mobile-tabbar'
import { StoreBootstrap } from '@/components/store-bootstrap'

/**
 * Vỏ ứng dụng — chỉ bọc các màn cần đăng nhập. Màn đăng nhập nằm ở nhóm (auth)
 * nên không đi qua đây.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <StoreBootstrap />
      <div className="flex h-dvh flex-col xl:flex-row">
        <AppSidebar className="hidden xl:flex" />
        <AppTopbar className="hidden md:flex xl:hidden" />
        <MobileHeader className="md:hidden" />
        {children}
        <MobileTabbar className="md:hidden" />
      </div>
    </>
  )
}
